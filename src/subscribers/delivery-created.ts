import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isFakeCustomer, buildFulfillmentDelivered, EXPECTED_DELIVERY_MINUTES } from "../analytics"
import { trackAnalyticsWorkflow } from "../workflows/track-analytics"

function minutesBetween(a?: Date | string | null, b?: Date | string | null): number {
  if (!a || !b) return 0
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
}

export default async function deliveryCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [fulfillment] } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "shipped_at", "created_at", "updated_at", "order.id", "order.customer_id", "order.customer.email"],
    filters: { id: data.id },
  })

  const f = fulfillment as any
  const order = f?.order
  if (!order?.customer_id) return

  const email = order.customer?.email
  if (isFakeCustomer(email)) return

  const actual = minutesBetween(f.shipped_at || f.created_at, f.updated_at)

  const payload = buildFulfillmentDelivered({
    customer_id: order.customer_id,
    email: email ?? "",
    order_id: order.id,
    fulfillment_id: f.id,
    expected_delivery_minutes: EXPECTED_DELIVERY_MINUTES,
    actual_delivery_minutes: actual,
  })

  await trackAnalyticsWorkflow(container).run({ input: payload })
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}
