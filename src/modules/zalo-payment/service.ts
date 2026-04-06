import { AbstractPaymentProvider, BigNumber, MedusaError, PaymentActions } from "@medusajs/framework/utils"
import {
  Logger,
  ProviderWebhookPayload,
  WebhookActionResult,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  PaymentSessionStatus,
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

  static validateOptions(options: Record<any, any>): void | never {
    if (!options.app_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "app_id is required for ZaloPay"
      )
    }
    if (!options.key1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "key1 is required for ZaloPay"
      )
    }
    if (!options.key2) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "key2 is required for ZaloPay"
      )
    }
  }

  constructor(container: InjectedDependencies, options: Options) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
    this.baseUrl = options.is_sandbox
      ? "https://sb-openapi.zalopay.vn/v2"
      : "https://openapi.zalopay.vn/v2"
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, context } = input
    const now = new Date()
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, "")
    const app_trans_id = `${dateStr}_${Math.floor(Math.random() * 1000000)}`

    // Store the Medusa session_id in embed_data so we can retrieve it from webhooks
    const embed_data = JSON.stringify({
      session_id: input.data?.session_id,
    })

    const order = {
      app_id: this.options_.app_id,
      app_trans_id,
      app_user: (context as any)?.customer?.email || "guest",
      app_time: Date.now(),
      amount: amount,
      item: JSON.stringify([]),
      embed_data,
      description: `Thanh toán đơn hàng #${app_trans_id}`,
      bank_code: "bank_sandbox",
    }

    const data = `${order.app_id}|${order.app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`
    const mac = CryptoJS.HmacSHA256(data, this.options_.key1).toString()

    try {
      const response = await axios.post(`${this.baseUrl}/create`, null, {
        params: { ...order, mac },
      })

      if (response.data.return_code !== 1) {
        throw new Error(response.data.return_message)
      }

      return {
        id: app_trans_id,
        data: {
          ...response.data,
          app_trans_id,
          session_id: input.data?.session_id,
          currency_code,
        },
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
      data: input.data,
    }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    // ZaloPay captures via webhook; this is a pass-through
    return {
      data: {
        ...input.data,
        status: "captured",
      },
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return {
      data: {
        ...input.data,
        status: "refunded",
      },
    }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return {
      data: {
        ...input.data,
        status: "canceled",
      },
    }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return {
      data: input.data,
    }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return {
      data: input.data,
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return {
      data: input.data,
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const { data: dataStr, mac: reqMac } = payload as unknown as {
      data: string
      mac: string
    }

    const mac = CryptoJS.HmacSHA256(dataStr, this.options_.key2).toString()

    if (reqMac !== mac) {
      this.logger_.error("Invalid ZaloPay webhook signature")
      return {
        action: PaymentActions.NOT_SUPPORTED,
        data: {
          session_id: "",
          amount: new BigNumber(0),
        },
      }
    }

    try {
      const result = JSON.parse(dataStr)

      // Retrieve the Medusa session_id stored in embed_data during initiatePayment
      const embedData = JSON.parse(result.embed_data || "{}")
      const session_id: string = embedData.session_id || ""

      if (!session_id) {
        this.logger_.warn("Session ID not found in ZaloPay webhook embed_data")
        return {
          action: PaymentActions.NOT_SUPPORTED,
          data: {
            session_id: "",
            amount: new BigNumber(0),
          },
        }
      }

      const amount = new BigNumber(result.amount || 0)

      // ZaloPay return_code 1 = success
      if (result.return_code === 1) {
        return {
          action: PaymentActions.SUCCESSFUL,
          data: {
            session_id,
            amount,
          },
        }
      }

      return {
        action: PaymentActions.FAILED,
        data: {
          session_id,
          amount,
        },
      }
    } catch (error: any) {
      this.logger_.error("ZaloPay getWebhookActionAndData error:", error.message)
      return {
        action: PaymentActions.FAILED,
        data: {
          session_id: "",
          amount: new BigNumber(0),
        },
      }
    }
  }
}

export default ZaloPayPaymentProviderService
