import {
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { 
  CreateCategoryImagesSchema,
} from "./admin/categories/[category_id]/images/route"
import { 
  UpdateCategoryImagesSchema,
  DeleteCategoryImagesSchema,
} from "./admin/categories/[category_id]/images/batch/route"

const optionalNonEmptyString = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value
    }

    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
  },
  z.string().optional()
)

/**
 * Address Schema (for shipping_address and billing_address)
 */
const AddressSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  address_1: z.string().optional(),
  address_2: z.string().optional(),
  city: z.string().optional(),
  country_code: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
})

/**
 * Store Cart Schemas
 */
export const CreateStoreCartSchema = z.object({
  region_id: z.string().optional(),
  currency_code: z.string().optional(),
  additional_data: z.record(z.unknown()).optional(),
  items: z.array(z.object({
    variant_id: z.string(),
    quantity: z.number().positive(),
  })).optional(),
  customer_id: optionalNonEmptyString,
  email: z.string().email().optional(),
  shipping_address: AddressSchema.optional(),
  billing_address: AddressSchema.optional(),
  locale: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  sales_channel_id: z.string().optional(),
})

export type PostStoreCartsBody = z.infer<typeof CreateStoreCartSchema>

export const UpdateStoreCartSchema = z.object({
  region_id: z.string().optional(),
  currency_code: z.string().optional(),
  customer_id: optionalNonEmptyString,
  additional_data: z.record(z.unknown()).optional(),
  email: z.string().email().optional(),
  shipping_address: AddressSchema.optional(),
  billing_address: AddressSchema.optional(),
  locale: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  sales_channel_id: z.string().optional(),
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
 * Auth Schemas
 */
export const AuthZaloSchema = z
  .object({
    access_token: z.string().min(1).optional(),
    accessToken: z.string().min(1).optional(),
  })
  .refine((data: { access_token?: string; accessToken?: string }) => !!(data.access_token || data.accessToken), {
    message: "access_token or accessToken is required",
  })

export type PostAuthZaloBody = z.infer<typeof AuthZaloSchema>

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

    // Auth alias for Zalo mini app
    {
      matcher: "/auth/zalo",
      method: "POST",
      middlewares: [validateAndTransformBody(AuthZaloSchema)],
    },
    {
      matcher: "/store/orders",
      method: "GET",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/orders/:id",
      method: "GET",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
})
