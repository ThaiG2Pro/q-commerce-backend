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
  // COD doesn't require external configuration
}

type InjectedDependencies = {
  logger: Logger
}

/**
 * COD (Cash on Delivery) Payment Provider
 * 
 * Luồng hoạt động:
 * 1. Customer chọn COD khi checkout
 * 2. Order được tạo với status "pending" (chưa thanh toán)
 * 3. Sau khi giao hàng thành công, staff gọi API capturePayment để mark as paid
 * 4. System update order status thành "paid"
 */
class CODPaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "cod"

  protected logger_: Logger
  protected options_: Options

  static validateOptions(options: Record<any, any>): void | never {
    // COD doesn't require any options validation
    return
  }

  constructor(container: InjectedDependencies, options: Options) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
  }

  /**
   * Initiate payment session cho COD
   * Không cần redirect URL, chỉ cần xác nhận payment method
   */
  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, context } = input
    
    this.logger_.info(`COD payment initiated for amount: ${amount} ${currency_code}`)

    // Generate unique transaction ID
    const transactionId = `cod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      id: transactionId,
      data: {
        transaction_id: transactionId,
        session_id: input.data?.session_id,
        amount,
        currency_code,
        status: "pending",
        payment_method: "cod",
        initiated_at: new Date().toISOString(),
      },
    }
  }

  /**
   * Authorize payment - COD được authorize ngay lập tức
   * Tuy nhiên, payment chưa được capture (chưa nhận tiền)
   */
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    this.logger_.info(`COD payment authorized: ${(input.data as Record<string, unknown> | undefined)?.transaction_id ?? ""}`)

    return {
      status: "authorized" as PaymentSessionStatus,
      data: {
        ...input.data,
        status: "authorized",
        authorized_at: new Date().toISOString(),
      },
    }
  }

  /**
   * Capture payment - được gọi sau khi giao hàng thành công
   * Staff sẽ gọi API này để xác nhận đã nhận tiền từ khách
   */
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    this.logger_.info(`COD payment captured: ${(input.data as Record<string, unknown> | undefined)?.transaction_id ?? ""}`)
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

  /**
   * Refund payment - hoàn tiền cho COD
   * Trong trường hợp COD, staff cần trả tiền lại cho khách
   */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    this.logger_.info(`COD payment refunded: ${(input.data as Record<string, unknown> | undefined)?.transaction_id ?? ""}`)

    return {
      data: {
        ...input.data,
        status: "refunded",
        refunded_at: new Date().toISOString(),
        refunded_amount: input.amount,
      },
    }
  }

  /**
   * Cancel payment - hủy payment trước khi capture
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    this.logger_.info(`COD payment canceled: ${(input.data as Record<string, unknown> | undefined)?.transaction_id ?? ""}`)

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

  /**
   * COD không cần webhook vì không có external payment gateway
   * Tất cả actions được trigger từ internal API calls
   */
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

export default CODPaymentProviderService
