import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isFakeCustomer, buildCartCreated } from "../analytics"
import { trackAnalyticsWorkflow } from "../workflows/track-analytics"

export default async function cartCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [cart] } = await query.graph({
    entity: "cart",
    fields: ["id", "customer_id", "customer.email", "currency_code"],
    filters: { id: data.id },
  })

  if (!cart?.customer_id) return
  const email = (cart as any).customer?.email
  if (isFakeCustomer(email)) return

  const payload = buildCartCreated({
    customer_id: cart.customer_id,
    email: email ?? "",
    cart_id: cart.id,
    currency_code: cart.currency_code,
  })

  await trackAnalyticsWorkflow(container).run({ input: payload })
}

export const config: SubscriberConfig = {
  event: "cart.created",
}
