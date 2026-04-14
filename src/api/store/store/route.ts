import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function pickMetadata(
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
  const [store] = await storeService.listStores()
  const metadata =
    store?.metadata && typeof store.metadata === "object"
      ? (store.metadata as Record<string, unknown>)
      : undefined

  const name =
    asString(process.env.STOREFRONT_SHOP_NAME) ||
    pickMetadata(metadata, ["shop_name", "shopName", "name"]) ||
    asString(store?.name) ||
    "Q-Commerce"

  const address =
    asString(process.env.STOREFRONT_SHOP_ADDRESS) ||
    pickMetadata(metadata, ["shop_address", "shopAddress", "address"]) ||
    ""

  const logo =
    asString(process.env.STOREFRONT_LOGO_URL) ||
    pickMetadata(metadata, ["logo_url", "logoUrl", "logo"]) ||
    ""

  return res.status(200).json({
    store: {
      id: store?.id || "store_compat",
      name,
      metadata: {
        shop_name: name,
        shop_address: address,
        logo_url: logo,
      },
    },
    storefront: {
      shop_name: name,
      shop_address: address,
      logo_url: logo,
    },
  })
}
