import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { convertCategoryThumbnailsStep } from "./steps/convert-category-thumbnails"
import { updateCategoryImagesStep } from "./steps/update-category-images"

export type UpdateCategoryImagesInput = {
  updates: {
    id: string
    type?: "thumbnail" | "image"
  }[]
}

export const updateCategoryImagesWorkflow = createWorkflow(
  "update-category-images",
  function (input: UpdateCategoryImagesInput) {
    when(input, (data) => data.updates.some((update) => update.type === "thumbnail"))
      .then(() => {
        const categoryImageIds = transform({ input }, (data) =>
          data.input.updates
            .filter((update) => update.type === "thumbnail")
            .map((update) => update.id)
        )

        const { data: categoryImages } = useQueryGraphStep({
          entity: "product_category_image",
          fields: ["category_id"],
          filters: {
            id: categoryImageIds,
          },
          options: {
            throwIfKeyNotFound: true,
          },
        })

        const categoryIds = transform({ categoryImages }, (data) =>
          data.categoryImages.map((image) => image.category_id)
        )

        convertCategoryThumbnailsStep({
          category_ids: categoryIds,
        })
      })

    const updatedImages = updateCategoryImagesStep({
      updates: input.updates,
    })

    return new WorkflowResponse(updatedImages)
  }
)
