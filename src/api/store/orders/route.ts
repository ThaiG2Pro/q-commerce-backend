import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { normalizeOrder } from "./_shared/shape"

type QueryGraphResult<T> = {
  data: T[]
  metadata?: {
    count?: number
  }
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const customerId = req.auth_context.actor_id

  const result = (await query.graph({
    entity: "order",
    fields: [
      "id",
      "items.*",
      "total",
      "created_at",
      "payment_status",
      "fulfillment_status",
    ],
    filters: {
      customer_id: customerId,
    },
  })) as QueryGraphResult<unknown>

  const orders = result.data.map(normalizeOrder)

  return res.status(200).json({
    orders,
    count: result.metadata?.count ?? orders.length,
  })
}
