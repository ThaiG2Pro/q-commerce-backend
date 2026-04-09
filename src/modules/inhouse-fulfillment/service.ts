import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentOption,
  ValidateFulfillmentDataContext,
  CalculateShippingOptionPriceContext,
} from "@medusajs/framework/types"

type Options = {
  default_warehouse_address?: string
  contact_phone?: string
  contact_email?: string
}

class InhouseFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "inhouse-fulfillment"

  protected options_: Options

  constructor(_: Record<string, unknown>, options: Options) {
    super()
    this.options_ = options
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      {
        id: "inhouse-standard",
        name: "In-house Standard Delivery",
      },
    ]
  }

  async validateFulfillmentData(
    _: Record<string, unknown>,
    data: Record<string, unknown>,
    __: ValidateFulfillmentDataContext
  ): Promise<Record<string, unknown>> {
    return data
  }

  async validateOption(_: Record<string, unknown>): Promise<boolean> {
    return true
  }

  async canCalculate(_: CreateShippingOptionDTO): Promise<boolean> {
    return true
  }

  async calculatePrice(
    _: Record<string, unknown>,
    __: Record<string, unknown>,
    ___: CalculateShippingOptionPriceContext
  ): Promise<CalculatedShippingOptionPrice> {
    return {
      calculated_amount: 30000,
      is_calculated_price_tax_inclusive: true,
    }
  }

  async createFulfillment(): Promise<CreateFulfillmentResult> {
    return {
      data: {
        tracking_number: `IH${Date.now().toString(36).toUpperCase()}`,
        status: "pending",
        warehouse_address: this.options_.default_warehouse_address || "Default Warehouse",
        contact_phone: this.options_.contact_phone,
        contact_email: this.options_.contact_email,
      },
      labels: [],
    }
  }

  async cancelFulfillment(): Promise<Record<string, unknown>> {
    return {
      canceled: true,
      canceled_at: new Date().toISOString(),
    }
  }

  async createReturnFulfillment(): Promise<CreateFulfillmentResult> {
    return {
      data: {
        status: "pending",
      },
      labels: [],
    }
  }
}

export default InhouseFulfillmentProviderService
