import { useRef, useState } from "react"
import { Button, CommandBar, FocusModal, Heading, toast } from "@medusajs/ui"
import { useQueryClient } from "@tanstack/react-query"
import { CategoryImage, UploadedFile } from "../../types"
import { useCategoryImageMutations } from "../../hooks/use-category-image"
import { CategoryImageGallery } from "./category-image-gallery"
import { CategoryImageUpload } from "./category-image-upload"

type CategoryMediaModalProps = {
  categoryId: string
  existingImages: CategoryImage[]
}

export const CategoryMediaModal = ({
  categoryId,
  existingImages,
}: CategoryMediaModalProps) => {
  const [open, setOpen] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [currentThumbnailId, setCurrentThumbnailId] = useState<string | null>(null)
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set())
  const [imagesToDelete, setImagesToDelete] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const {
    uploadFilesMutation,
    createImagesMutation,
    updateImagesMutation,
    deleteImagesMutation,
  } = useCategoryImageMutations({
    categoryId,
    onCreateSuccess: () => {
      setOpen(false)
      resetModalState()
    },
    onUpdateSuccess: () => {
      setSelectedImageIds(new Set())
    },
    onDeleteSuccess: (deletedIds) => {
      setSelectedImageIds(new Set())
      if (currentThumbnailId && deletedIds.includes(currentThumbnailId)) {
        setCurrentThumbnailId(null)
      }
    },
  })

  const isSaving =
    createImagesMutation.isPending ||
    updateImagesMutation.isPending ||
    deleteImagesMutation.isPending

  const getInitialThumbnailId = () =>
    existingImages.find((image) => image.type === "thumbnail")?.id || null

  const resetModalState = () => {
    setUploadedFiles([])
    setCurrentThumbnailId(getInitialThumbnailId())
    setSelectedImageIds(new Set())
    setImagesToDelete(new Set())
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)

    if (isOpen) {
      setCurrentThumbnailId(getInitialThumbnailId())
      return
    }

    resetModalState()
  }

  const handleUploadFile = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const filesArray = Array.from(files)
    uploadFilesMutation.mutate(filesArray, {
      onSuccess: (data) => {
        setUploadedFiles((prev) => [...prev, ...data.files])
      },
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleImageSelection = (id: string, isUploaded: boolean = false) => {
    const itemId = isUploaded ? `uploaded:${id}` : id
    const newSelected = new Set(selectedImageIds)

    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }

    setSelectedImageIds(newSelected)
  }

  const handleSetAsThumbnail = () => {
    if (selectedImageIds.size !== 1) return

    const selectedId = Array.from(selectedImageIds)[0]
    setCurrentThumbnailId(selectedId)

    if (selectedId.startsWith("uploaded:")) {
      const uploadedFileId = selectedId.replace("uploaded:", "")
      setUploadedFiles((prev) =>
        prev.map((file) =>
          file.id === uploadedFileId ? { ...file, type: "thumbnail" } : file
        )
      )
    }

    setSelectedImageIds(new Set())
  }

  const handleDelete = () => {
    if (selectedImageIds.size === 0) return

    const uploadedFileIds: string[] = []
    const savedImageIds: string[] = []

    selectedImageIds.forEach((id) => {
      if (id.startsWith("uploaded:")) {
        uploadedFileIds.push(id.replace("uploaded:", ""))
      } else {
        savedImageIds.push(id)
      }
    })

    if (uploadedFileIds.length > 0) {
      setUploadedFiles((prev) =>
        prev.filter((file) => !uploadedFileIds.includes(file.id))
      )

      if (currentThumbnailId?.startsWith("uploaded:")) {
        const thumbnailFileId = currentThumbnailId.replace("uploaded:", "")
        if (uploadedFileIds.includes(thumbnailFileId)) {
          setCurrentThumbnailId(null)
        }
      }
    }

    if (savedImageIds.length > 0) {
      setImagesToDelete((prev) => {
        const newSet = new Set(prev)
        savedImageIds.forEach((id) => newSet.add(id))
        return newSet
      })

      if (currentThumbnailId && savedImageIds.includes(currentThumbnailId)) {
        setCurrentThumbnailId(null)
      }
    }

    setSelectedImageIds(new Set())
  }

  const handleSave = async () => {
    const hasNewImages = uploadedFiles.length > 0
    const hasImagesToDelete = imagesToDelete.size > 0
    const initialThumbnailId = getInitialThumbnailId()
    const currentSavedThumbnailId =
      currentThumbnailId && !currentThumbnailId.startsWith("uploaded:")
        ? currentThumbnailId
        : null
    const thumbnailChanged =
      currentSavedThumbnailId !== null &&
      currentSavedThumbnailId !== initialThumbnailId

    if (!hasNewImages && !hasImagesToDelete && !thumbnailChanged) {
      setOpen(false)
      return
    }

    try {
      const operations: Array<Promise<unknown>> = []

      if (hasNewImages) {
        const imagesToCreate = uploadedFiles.map((file) => ({
          url: file.url,
          file_id: file.id,
          type:
            file.type ||
            (currentThumbnailId === `uploaded:${file.id}` ? "thumbnail" : "image"),
        }))

        operations.push(createImagesMutation.mutateAsync(imagesToCreate))
      }

      if (thumbnailChanged && currentSavedThumbnailId) {
        operations.push(
          updateImagesMutation.mutateAsync([
            {
              id: currentSavedThumbnailId,
              type: "thumbnail",
            },
          ])
        )
      }

      if (hasImagesToDelete) {
        operations.push(
          deleteImagesMutation.mutateAsync(Array.from(imagesToDelete))
        )
      }

      await Promise.all(operations)

      queryClient.invalidateQueries({ queryKey: ["category-images", categoryId] })
      setOpen(false)
      resetModalState()
      toast.success("Category media saved successfully")
    } catch (error) {
      toast.error("Failed to save changes")
    }
  }

  return (
    <FocusModal open={open} onOpenChange={handleOpenChange}>
      <FocusModal.Trigger asChild>
        <Button size="small" variant="secondary">
          Edit
        </Button>
      </FocusModal.Trigger>

      <FocusModal.Content>
        <FocusModal.Header>
          <Heading>Edit Media</Heading>
        </FocusModal.Header>

        <FocusModal.Body className="flex h-full overflow-hidden">
          <div className="flex h-full w-full flex-col-reverse lg:grid lg:grid-cols-[1fr_560px]">
            <CategoryImageGallery
              existingImages={existingImages}
              uploadedFiles={uploadedFiles}
              currentThumbnailId={currentThumbnailId}
              imagesToDelete={imagesToDelete}
              selectedImageIds={selectedImageIds}
              onToggleSelect={handleImageSelection}
            />
            <CategoryImageUpload
              fileInputRef={fileInputRef}
              isUploading={uploadFilesMutation.isPending}
              onFileSelect={handleUploadFile}
            />
          </div>

          <CommandBar open={selectedImageIds.size > 0}>
            <CommandBar.Bar>
              <CommandBar.Value>{selectedImageIds.size} selected</CommandBar.Value>
              <CommandBar.Seperator />
              <CommandBar.Command
                action={handleSetAsThumbnail}
                label="Set as thumbnail"
                shortcut="t"
                disabled={selectedImageIds.size !== 1}
              />
              <CommandBar.Seperator />
              <CommandBar.Command
                action={handleDelete}
                label="Delete"
                shortcut="d"
              />
            </CommandBar.Bar>
          </CommandBar>
        </FocusModal.Body>

        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <FocusModal.Close asChild>
              <Button size="small" variant="secondary">
                Cancel
              </Button>
            </FocusModal.Close>
            <Button size="small" onClick={handleSave} isLoading={isSaving}>
              Save
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}
