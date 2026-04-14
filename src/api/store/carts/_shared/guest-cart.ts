import path from "path"
import type { MedusaStoreRequest } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { refreshPaymentCollectionForCartWorkflow, updateTaxLinesWorkflow } from "@medusajs/core-flows"
import type { PostStoreCartsBody, PostStoreCartByIdBody } from "../../../middlewares"

const coreFlowsRoot = path.dirname(require.resolve("@medusajs/core-flows"))
const { getVariantsAndItemsWithPrices } = require(path.join(
  coreFlowsRoot,
  "cart/workflows/get-variants-and-items-with-prices.js"
)) as {
  getVariantsAndItemsWithPrices: (scope: MedusaStoreRequest["scope"]) => {
    run: (args: { input: Record<string, unknown> }) => Promise<{ result: { lineItems: Array<{ data: Record<string, unknown> }> } }>
  }
}

async function resolveRegion(req: MedusaStoreRequest, regionId?: string): Promise<{ id: string; currency_code: string }> {
  const regionService = req.scope.resolve(Modules.REGION)
  const regions = regionId
    ? await regionService.listRegions({ id: regionId }, { take: 1 })
    : await regionService.listRegions({}, { take: 1 })
  const region = regions[0] ?? null

  if (!region || typeof region.id !== "string" || typeof region.currency_code !== "string") {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "No regions found")
  }

  return {
    id: region.id,
    currency_code: region.currency_code,
  }
}

async function resolveSalesChannel(req: MedusaStoreRequest, salesChannelId?: string): Promise<{ id: string }> {
  const salesChannelService = req.scope.resolve(Modules.SALES_CHANNEL)
  const salesChannels = salesChannelId
    ? await salesChannelService.listSalesChannels({ id: salesChannelId }, { take: 1 })
    : await salesChannelService.listSalesChannels({}, { take: 1 })
  const salesChannel = salesChannels[0] ?? null

  if (!salesChannel || typeof salesChannel.id !== "string") {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "No sales channels found")
  }

  return {
    id: salesChannel.id,
  }
}

export async function createGuestCart(req: MedusaStoreRequest<PostStoreCartsBody>) {
  const cartService = req.scope.resolve(Modules.CART)
  const region = await resolveRegion(req, req.validatedBody.region_id)
  const salesChannel = await resolveSalesChannel(req)
  const currencyCode = req.validatedBody.currency_code ?? region.currency_code

  if (!currencyCode) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "currency_code is required")
  }

  const items = req.validatedBody.items?.length
    ? (
        await getVariantsAndItemsWithPrices(req.scope).run({
          input: {
            cart: {
              currency_code: currencyCode,
              region,
              region_id: region.id,
            },
            items: req.validatedBody.items,
            setPricingContextResult: {},
          },
        })
      ).result.lineItems.map((item) => item.data)
    : undefined

  const cart = await (cartService.createCarts as (data: any) => Promise<any>)({
    region_id: region.id,
    sales_channel_id: salesChannel.id,
    currency_code: currencyCode,
    items,
    metadata: req.validatedBody.additional_data,
  })

  await updateTaxLinesWorkflow(req.scope).run({
    input: {
      cart_id: cart.id,
    },
  })

  await refreshPaymentCollectionForCartWorkflow(req.scope).run({
    input: {
      cart,
    },
  })

  return cart
}

export async function updateGuestCart(
  req: MedusaStoreRequest<PostStoreCartByIdBody>,
  cartId: string
) {
  const cartService = req.scope.resolve(Modules.CART)
  const updateData: Record<string, unknown> = {
    ...req.validatedBody,
    metadata: req.validatedBody.additional_data,
  }

  delete updateData.additional_data
  delete updateData.customer_id

  if (req.validatedBody.region_id) {
    const region = await resolveRegion(req, req.validatedBody.region_id)
    updateData.currency_code = req.validatedBody.currency_code ?? region.currency_code
  }

  await (cartService.updateCarts as (cartId: string, data: Record<string, unknown>) => Promise<unknown>)(
    cartId,
    updateData
  )
}
