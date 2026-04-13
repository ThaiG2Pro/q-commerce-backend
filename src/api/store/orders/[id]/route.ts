import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { normalizeOrder } from "../_shared/shape"

type QueryGraphResult<T> = {
  data: T[]
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
      id: req.params.id,
      customer_id: customerId,
    },
  })) as QueryGraphResult<unknown>

  const order = result.data[0]
  if (!order) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  }

  return res.status(200).json({
    order: normalizeOrder(order),
  })
}
