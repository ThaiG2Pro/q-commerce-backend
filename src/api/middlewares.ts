import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "zod"

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

    // Auth alias for Zalo mini app
    {
      matcher: "/auth/zalo",
      method: "POST",
      middlewares: [validateAndTransformBody(AuthZaloSchema)],
    },
  ],
})
