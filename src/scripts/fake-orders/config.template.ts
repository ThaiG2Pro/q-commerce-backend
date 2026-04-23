export type AddressConfig = {
  first_name: string
  last_name: string
  address_1: string
  address_2?: string
  city: string
  province?: string
  country_code: string
  postal_code?: string
  phone: string
}

export type FakeOrdersConfig = {
  baseUrl: string
  publishableKey: string
  fixedPassword: string
  regionId: string
  shippingOptionName: string
  paymentProviderId: string
  orderCount: number
  accountCount: number
  backDay: number
  minItemsPerOrder: number
  maxItemsPerOrder: number
  delayMsBetweenOrders: number
  tsStepMs?: number
  tsJitterMs?: number
  shippingAddress: AddressConfig
  billingAddress: AddressConfig
}

const config: FakeOrdersConfig = {
  baseUrl: "http://localhost:9000",
  publishableKey: "pk_c4c2e2da3439360ceea472142d633c8c408ac63c99365de339faad78bc058805",
  fixedPassword: "Guest@123456",
  regionId: "reg_01KNSANJ6FC3RVAKBEFV0M5G1N",
  shippingOptionName: "Giao tiết kiệm (15-20 phút)",
  paymentProviderId: "pp_cod_cod",
  orderCount: 10,
  accountCount: 10,
  backDay: 0,
  minItemsPerOrder: 1,
  maxItemsPerOrder: 2,
  delayMsBetweenOrders: 0,
  tsStepMs: 50,
  tsJitterMs: 50,
  shippingAddress: {
    first_name: "Guest",
    last_name: "Buyer",
    address_1: "123 Nguyen Trai",
    city: "Ho Chi Minh City",
    province: "HCM",
    country_code: "vn",
    postal_code: "700000",
    phone: "+84900000000",
  },
  billingAddress: {
    first_name: "Guest",
    last_name: "Buyer",
    address_1: "123 Nguyen Trai",
    city: "Ho Chi Minh City",
    province: "HCM",
    country_code: "vn",
    postal_code: "700000",
    phone: "+84900000000",
  },
}

export default config
