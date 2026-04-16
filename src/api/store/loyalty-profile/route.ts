import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type LoyaltyProfile = {
  points: number
  expiry_date: string | null
  expiryDate: string | null
  barcode_value: string
  barcodeValue: string
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized.length ? normalized : null
}

function buildDefaultProfile(): LoyaltyProfile {
  return {
    points: 0,
    expiry_date: null,
    expiryDate: null,
    barcode_value: "",
    barcodeValue: "",
  }
}

export async function GET(req: MedusaStoreRequest, res: MedusaResponse) {
  const actorId = req.auth_context?.actor_id
  if (!actorId) {
    return res.status(200).json({
      loyalty_profile: buildDefaultProfile(),
    })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "metadata"],
    filters: { id: actorId },
  })

  const customer = Array.isArray(data) ? data[0] : undefined
  const metadata =
    customer &&
    typeof customer === "object" &&
    "metadata" in customer &&
    customer.metadata &&
    typeof customer.metadata === "object"
      ? (customer.metadata as Record<string, unknown>)
      : undefined

  const points = toNumber(metadata?.points ?? metadata?.loyalty_points)
  const expiry =
    toStringOrNull(metadata?.expiry_date) || toStringOrNull(metadata?.expiryDate)
  const barcode =
    toStringOrNull(metadata?.barcode_value) ||
    toStringOrNull(metadata?.barcodeValue) ||
    ""

  res.status(200).json({
    loyalty_profile: {
      points,
      expiry_date: expiry,
      expiryDate: expiry,
      barcode_value: barcode,
      barcodeValue: barcode,
    },
  })
}
