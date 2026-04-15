import { useState, useRef } from "react"
import { FocusModal, Button, Heading, toast } from "@medusajs/ui"
import { useQueryClient } from "@tanstack/react-query"
import { CategoryImage, UploadedFile } from "../../types"
import { CategoryImageGallery } from "./category-image-gallery"
import { CategoryImageUpload } from "./category-image-upload"
import { useCategoryImageMutations } from "../../hooks/use-category-image"

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
  const [currentThumbnailId, setCurrentThumbnailId] = useState<string | null>(
    null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const {
    uploadFilesMutation,
    createImagesMutation,
  } = useCategoryImageMutations({
    categoryId,
    onCreateSuccess: () => {
      setOpen(false)
      resetModalState()
    },
  })

  const isSaving = 
    createImagesMutation.isPending

  // TODO add functions
    const resetModalState = () => {
    setUploadedFiles([])
    setCurrentThumbnailId(null)
    }

    const initializeThumbnail = () => {
    const thumbnailImage = existingImages.find((img) => img.type === "thumbnail")
    if (thumbnailImage?.id) {
        setCurrentThumbnailId(thumbnailImage.id)
    }
    }

    const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
        initializeThumbnail()
    } else {
        resetModalState()
    }
    }

// TODO handle upload file
    const handleUploadFile = (files: FileList | null) => {
  if (!files || files.length === 0) {return}
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

// TODO handle save
    const handleSave = async () => {
  const hasNewImages = uploadedFiles.length > 0

  try {
    const operations: Array<Promise<unknown>> = []
    if (hasNewImages) {
      const imagesToCreate = uploadedFiles.map((file) => ({
        url: file.url,
        file_id: file.id,
        type: file.type || (currentThumbnailId === `uploaded:${file.id}` ? 
          "thumbnail" : "image"
        ),
      }))
      operations.push(createImagesMutation.mutateAsync(imagesToCreate))
    }

    // TODO add update and delete operations

    await Promise.all(operations)

    queryClient.invalidateQueries({ queryKey: ["category-images", categoryId] })
    setOpen(false)
    resetModalState()
    toast.success("Category media saved successfully")
  } catch (error) {
    toast.error("Failed to save changes")
  }
}

// TODO render modal
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
        <div className="flex w-full h-full flex-col-reverse lg:grid lg:grid-cols-[1fr_560px]">
          <CategoryImageGallery
            existingImages={existingImages}
            uploadedFiles={uploadedFiles}
            currentThumbnailId={currentThumbnailId}
          />
          <CategoryImageUpload
            fileInputRef={fileInputRef}
            isUploading={uploadFilesMutation.isPending}
            onFileSelect={handleUploadFile}
          />
        </div>
        {/* TODO show command bar */}
      </FocusModal.Body>
      <FocusModal.Footer>
        <div className="flex items-center justify-end gap-x-2">
          <FocusModal.Close asChild>
            <Button size="small" variant="secondary">
              Cancel
            </Button>
          </FocusModal.Close>
          <Button
            size="small"
            onClick={handleSave}
            isLoading={isSaving}
          >
            Save
          </Button>
        </div>
      </FocusModal.Footer>
    </FocusModal.Content>
  </FocusModal>
)
}