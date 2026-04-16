import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_MEDIA_MODULE } from "../../modules/products-media"
import ProductMediaModuleService from "../../modules/products-media/service"

export type UpdateCategoryImagesStepInput = {
  updates: {
    id: string
    type?: "thumbnail" | "image"
  }[]
}

export const updateCategoryImagesStep = createStep(
  "update-category-images-step",
  async (input: UpdateCategoryImagesStepInput, { container }) => {
    const productMediaService: ProductMediaModuleService =
      container.resolve(PRODUCT_MEDIA_MODULE)

    const prevData = await productMediaService.listProductCategoryImages({
      id: input.updates.map((update) => update.id),
    })

    const updatedData = await productMediaService.updateProductCategoryImages(
      input.updates
    )

    return new StepResponse(updatedData, prevData)
  },
  async (compensationData, { container }) => {
    if (!compensationData?.length) {
      return
    }

    const productMediaService: ProductMediaModuleService =
      container.resolve(PRODUCT_MEDIA_MODULE)

    await productMediaService.updateProductCategoryImages(
      compensationData.map((image) => ({
        id: image.id,
        type: image.type,
      }))
    )
  }
)
