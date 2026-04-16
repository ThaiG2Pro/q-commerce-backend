// src/api/admin/categories/[category_id]/images/batch/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  deleteCategoryImagesWorkflow,
} from "../../../../../../workflows/delete-category-image"
import {
  updateCategoryImagesWorkflow,
} from "../../../../../../workflows/update-category-images"
import { z } from "@medusajs/framework/zod"

// Schema for POST (update)
export const UpdateCategoryImagesSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    type: z.enum(["thumbnail", "image"]),
  })).min(1, "At least one update is required"),
})

type UpdateCategoryImagesInput = z.infer<typeof UpdateCategoryImagesSchema>

export async function POST(
  req: MedusaRequest<UpdateCategoryImagesInput>,
  res: MedusaResponse
): Promise<void> {
  const { updates } = req.validatedBody

  const { result } = await updateCategoryImagesWorkflow(req.scope).run({
    input: { updates },
  })

  res.status(200).json({ category_images: result })
}

// Schema for DELETE
export const DeleteCategoryImagesSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one ID is required"),
})

type DeleteCategoryImagesInput = z.infer<typeof DeleteCategoryImagesSchema>

export async function DELETE(
  req: MedusaRequest<DeleteCategoryImagesInput>,
  res: MedusaResponse
): Promise<void> {
  const { ids } = req.validatedBody

  await deleteCategoryImagesWorkflow(req.scope).run({
    input: { ids },
  })

  res.status(200).json({
    deleted: ids,
  })
}
