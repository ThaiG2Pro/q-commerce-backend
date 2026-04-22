import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { isFakeCustomer, buildCustomerCreated } from "../analytics"
import { trackAnalyticsWorkflow } from "../workflows/track-analytics"

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule.retrieveCustomer(data.id)

  if (isFakeCustomer(customer.email)) return

  const payload = buildCustomerCreated({
    customer_id: customer.id,
    email: customer.email!,
  })

  await trackAnalyticsWorkflow(container).run({ input: payload })
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
