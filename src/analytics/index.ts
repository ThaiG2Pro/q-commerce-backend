export { ANALYTICS_EVENTS, SCHEMA_VERSION, EXPECTED_DELIVERY_MINUTES } from "./constants"
export { detectCustomerType, isFakeCustomer, type CustomerType } from "./detect-customer-type"
export {
  buildCustomerCreated,
  buildCartCreated,
  buildOrderPlaced,
  buildFulfillmentDelivered,
  type AnalyticsPayload,
  type AnalyticsSource,
} from "./contracts"
