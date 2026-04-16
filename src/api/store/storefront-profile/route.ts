import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function pickStorefrontField(
  metadata: Record<string, unknown> | undefined,
  keys: string[]
): string | undefined {
  if (!metadata) {
    return undefined
  }

  for (const key of keys) {
    const value = asString(metadata[key])
    if (value) {
      return value
    }
  }

  return undefined
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const storeService = req.scope.resolve(Modules.STORE)
  const stores = await storeService.listStores()
  const store = stores[0]
  const metadata =
    store?.metadata && typeof store.metadata === "object"
      ? (store.metadata as Record<string, unknown>)
      : undefined

  const shop_name =
    asString(process.env.STOREFRONT_SHOP_NAME) ||
    pickStorefrontField(metadata, ["shop_name", "shopName", "name"]) ||
    asString(store?.name) ||
    "Q-Commerce"

  const shop_address =
    asString(process.env.STOREFRONT_SHOP_ADDRESS) ||
    pickStorefrontField(metadata, ["shop_address", "shopAddress", "address"]) ||
    ""

  const logo_url =
    asString(process.env.STOREFRONT_LOGO_URL) ||
    pickStorefrontField(metadata, ["logo_url", "logoUrl", "logo"]) ||
    ""

  res.status(200).json({
    storefront: {
      shop_name,
      shop_address,
      logo_url,
    },
  })
}
