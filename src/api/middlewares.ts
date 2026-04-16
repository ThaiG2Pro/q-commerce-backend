import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { 
  CreateCategoryImagesSchema,
} from "./admin/categories/[category_id]/images/route"
import { 
  UpdateCategoryImagesSchema,
  DeleteCategoryImagesSchema,
} from "./admin/categories/[category_id]/images/batch/route"


/**
 * Store Cart Schemas
 */
export const CreateStoreCartSchema = z.object({
  region_id: z.string().optional(),
  currency_code: z.string().optional(),
  items: z.array(z.object({
    variant_id: z.string(),
    quantity: z.number().positive(),
  })).optional(),
  customer_id: z.string().optional(),
})

export type PostStoreCartsBody = z.infer<typeof CreateStoreCartSchema>

export const UpdateStoreCartSchema = z.object({
  region_id: z.string().optional(),
  currency_code: z.string().optional(),
  customer_id: z.string().optional(),
})

export type PostStoreCartByIdBody = z.infer<typeof UpdateStoreCartSchema>

/**
 * Store Customer Schemas
 */
export const CreateStoreCustomerSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
})

export type PostStoreCustomersBody = z.infer<typeof CreateStoreCustomerSchema>

/**
 * Middleware Configuration
 * 
 * Note: OPTIONS requests are automatically handled by Medusa framework.
 * They bypass authentication middleware by default.
 */
export default defineMiddlewares({
  routes: [
    // Store cart endpoints validation
    {
      matcher: "/store/carts",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateStoreCartSchema)],
    },
    {
      matcher: "/store/carts/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateStoreCartSchema)],
    },

    // Store customer endpoints validation
    {
      matcher: "/store/customers",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateStoreCustomerSchema)],
    },
    {
      matcher: "/admin/categories/:category_id/images",
      method: ["POST"],
      middlewares: [
        validateAndTransformBody(CreateCategoryImagesSchema),],
    },
    {
      matcher: "/admin/categories/:category_id/images/batch",
      method: ["POST"],
      middlewares: [
        validateAndTransformBody(UpdateCategoryImagesSchema),
      ],
    },
    {
      matcher: "/admin/categories/:category_id/images/batch",
      method: ["DELETE"],
      middlewares: [
        validateAndTransformBody(DeleteCategoryImagesSchema),
      ],
    },
  ],
})
