import { AbstractPaymentProvider, MedusaError } from "@medusajs/framework/utils"
import { 
  Logger, 
  ProviderWebhookPayload, 
  WebhookActionResult,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  PaymentSessionStatus
} from "@medusajs/framework/types"
import axios from "axios"
import CryptoJS from "crypto-js"

type Options = {
  app_id: string
  key1: string
  key2: string
  is_sandbox?: boolean
}

type InjectedDependencies = {
  logger: Logger
}

class ZaloPayPaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "zalopay"

  protected logger_: Logger
  protected options_: Options
  protected baseUrl: string

  constructor(container: InjectedDependencies, options: Options) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
    this.baseUrl = options.is_sandbox 
      ? "https://sb-openapi.zalopay.vn/v2" 
      : "https://openapi.zalopay.vn/v2"
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const { amount, context } = input
    const now = new Date()
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "")
    const app_trans_id = `${dateStr}_${Math.floor(Math.random() * 1000000)}`

    const order = {
      app_id: this.options_.app_id,
      app_trans_id,
      app_user: (context as any).customer?.email || "guest",
      app_time: Date.now(),
      amount: amount, 
      item: JSON.stringify([]),
      embed_data: JSON.stringify({}),
      description: `Thanh toán đơn hàng #${app_trans_id}`,
      bank_code: "bank_sandbox", 
    }

    const data = `${order.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`
    const mac = CryptoJS.HmacSHA256(data, this.options_.key1).toString()

    try {
      const response = await axios.post(`${this.baseUrl}/create`, null, {
        params: { ...order, mac }
      })

      if (response.data.return_code !== 1) {
        throw new Error(response.data.return_message)
      }

      return {
        id: app_trans_id,
        data: {
          ...response.data,
          app_trans_id
        }
      }
    } catch (error: any) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        error.message || "Lỗi khởi tạo thanh toán ZaloPay"
      )
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    return {
      status: "pending" as PaymentSessionStatus,
      data: input.data
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const { data: dataStr, mac: reqMac } = payload as { data: string; mac: string }
    const mac = CryptoJS.HmacSHA256(dataStr, this.options_.key2).toString()

    if (reqMac !== mac) {
      return { action: "not_supported", data: {} }
    }

    const result = JSON.parse(dataStr)
    return {
      action: "captured",
      data: {
        ...result,
        amount: result.amount,
        transaction_id: result.app_trans_id
      }
    }
  }

  async capturePayment(paymentData: Record<string, any>): Promise<Record<string, any>> {
    return { ...paymentData, status: "captured" }
  }

  async refundPayment(paymentData: Record<string, any>): Promise<Record<string, any>> {
    return { ...paymentData, status: "refunded" }
  }

  async cancelPayment(paymentData: Record<string, any>): Promise<Record<string, any>> {
    return { ...paymentData, status: "canceled" }
  }

  async deletePayment(paymentData: Record<string, any>): Promise<Record<string, any>> {
    return { ...paymentData }
  }

  async getPaymentStatus(data: Record<string, any>): Promise<PaymentSessionStatus> {
    if (data.zp_trans_id) return "authorized" as PaymentSessionStatus
    return "pending" as PaymentSessionStatus
  }

  async retrievePayment(paymentData: Record<string, any>): Promise<Record<string, any>> {
    return paymentData
  }

  async updatePayment(input: any): Promise<any> {
    return { data: input.data }
  }
}

export default ZaloPayPaymentProviderService