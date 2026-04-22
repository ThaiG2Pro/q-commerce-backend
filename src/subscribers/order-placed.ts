import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isFakeCustomer, buildOrderPlaced } from "../analytics"
import { trackAnalyticsWorkflow } from "../workflows/track-analytics"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [order] } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "customer.email", "cart.id", "total", "currency_code", "items.*"],
    filters: { id: data.id },
  })

  if (!order?.customer_id) return
  const email = (order as any).customer?.email
  if (isFakeCustomer(email)) return

  const payload = buildOrderPlaced({
    customer_id: order.customer_id,
    email: email ?? "",
    order_id: order.id,
    cart_id: (order as any).cart?.id,
    total: order.total,
    currency_code: order.currency_code,
    items_count: order.items?.length,
  })

  await trackAnalyticsWorkflow(container).run({ input: payload })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
