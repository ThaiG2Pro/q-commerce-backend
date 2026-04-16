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
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  PaymentSessionStatus,
} from "@medusajs/framework/types"

type Options = {
  qr_code_url: string
}

type InjectedDependencies = {
  logger: Logger
}

class QRPaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "qr"

  protected logger_: Logger
  protected options_: Options

  static validateOptions(options: Record<any, any>): void | never {
    if (!options.qr_code_url) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "qr_code_url is required for QR payment provider"
      )
    }

    return
  }

  constructor(container: InjectedDependencies, options: Options) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const { amount, currency_code } = input

    this.logger_.info(`QR payment initiated for amount: ${amount} ${currency_code}`)

    const transactionId = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      id: transactionId,
      data: {
        transaction_id: transactionId,
        session_id: input.data?.session_id,
        amount,
        currency_code,
        status: "pending",
        payment_method: "qr",
        qr_code_url: this.options_.qr_code_url,
        initiated_at: new Date().toISOString(),
      },
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    this.logger_.info(`QR payment authorized: ${(input.data as Record<string, unknown> | undefined)?.transaction_id ?? ""}`)

    return {
      status: "authorized" as PaymentSessionStatus,
      data: {
        ...input.data,
        status: "authorized",
        authorized_at: new Date().toISOString(),
      },
    }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    this.logger_.info(`QR payment captured: ${(input.data as Record<string, unknown> | undefined)?.transaction_id ?? ""}`)
    const data = (input.data ?? {}) as Record<string, unknown>

    return {
      data: {
        ...data,
        status: "captured",
        captured_at: new Date().toISOString(),
        captured_amount: data.amount,
      },
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    this.logger_.info(`QR payment refunded: ${(input.data as Record<string, unknown> | undefined)?.transaction_id ?? ""}`)

    return {
      data: {
        ...input.data,
        status: "refunded",
        refunded_at: new Date().toISOString(),
        refunded_amount: input.amount,
      },
    }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    this.logger_.info(`QR payment canceled: ${(input.data as Record<string, unknown> | undefined)?.transaction_id ?? ""}`)

    return {
      data: {
        ...input.data,
        status: "canceled",
        canceled_at: new Date().toISOString(),
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
      data: {
        ...input.data,
        updated_at: new Date().toISOString(),
      },
    }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const status = (input.data as Record<string, unknown> | undefined)?.status

    switch (status) {
      case "captured":
        return { status: "captured", data: input.data }
      case "authorized":
        return { status: "authorized", data: input.data }
      case "canceled":
        return { status: "canceled", data: input.data }
      case "refunded":
        return { status: "canceled", data: input.data }
      default:
        return { status: "pending", data: input.data }
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return {
      action: PaymentActions.NOT_SUPPORTED,
      data: {
        session_id: "",
        amount: new BigNumber(0),
      },
    }
  }
}

export default QRPaymentProviderService
