import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

type BranchResponse = {
  name: string
  address: string
  location: {
    lat: number
    lng: number
  }
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

function toAddress(location: Record<string, unknown> | undefined): string {
  if (!location) {
    return ""
  }

  const parts = [
    typeof location.address_1 === "string" ? location.address_1 : "",
    typeof location.city === "string" ? location.city : "",
    typeof location.country_code === "string" ? location.country_code : "",
  ].filter(Boolean)

  return parts.join(", ")
}

function buildFallbackBranches(): BranchResponse[] {
  const fallbackName = process.env.STOREFRONT_BRANCH_NAME || "Chi nhánh trung tâm"
  const fallbackAddress = process.env.STOREFRONT_BRANCH_ADDRESS || ""
  const fallbackLat = toNumber(process.env.STOREFRONT_BRANCH_LAT) ?? 0
  const fallbackLng = toNumber(process.env.STOREFRONT_BRANCH_LNG) ?? 0

  return [
    {
      name: fallbackName,
      address: fallbackAddress,
      location: {
        lat: fallbackLat,
        lng: fallbackLng,
      },
    },
  ]
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const stockLocationService = req.scope.resolve(Modules.STOCK_LOCATION)
  const locations = await stockLocationService.listStockLocations({})

  const branches = locations
    .map((location): BranchResponse => {
      const metadata =
        location?.metadata && typeof location.metadata === "object"
          ? (location.metadata as Record<string, unknown>)
          : undefined
      const metadataLocation =
        metadata?.location && typeof metadata.location === "object"
          ? (metadata.location as Record<string, unknown>)
          : undefined
      const fallbackLat = toNumber(metadata?.lat) ?? 0
      const fallbackLng = toNumber(metadata?.lng) ?? 0

      return {
        name:
          (typeof location?.name === "string" && location.name) || "Chi nhánh",
        address: toAddress(location?.address as Record<string, unknown>),
        location: {
          lat: toNumber(metadataLocation?.lat) ?? fallbackLat,
          lng: toNumber(metadataLocation?.lng) ?? fallbackLng,
        },
      }
    })
    .filter((branch) => branch.name || branch.address)

  res.status(200).json({
    branches: branches.length ? branches : buildFallbackBranches(),
  })
}
