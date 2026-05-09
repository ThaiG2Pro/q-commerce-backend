import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import fs from "fs"
import path from "path"
import config from "./config.template"
import {
  buildCustomerCreated,
  buildCartCreated,
  buildOrderPlaced,
  buildFulfillmentDelivered,
  EXPECTED_DELIVERY_MINUTES,
} from "../../analytics"

// --- CLI arg helpers ---

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const arg = process.argv.find((a) => a.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : undefined
}

function intArg(name: string, def: number): number {
  const v = parseArg(name)
  return v ? parseInt(v, 10) : def
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// --- HTTP helpers ---

const PK = config.publishableKey

async function apiFetch(baseUrl: string, path: string, opts: { method?: string; body?: any; token?: string } = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-publishable-api-key": PK,
  }
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`

  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${opts.method || "GET"} ${path}: ${res.status} ${text.slice(0, 200)}`)
  }
  return res.json()
}

async function adminLogin(baseUrl: string): Promise<string> {
  const email = process.env.FAKE_ORDERS_ADMIN_EMAIL || "thai@q-com.com"
  const password = process.env.FAKE_ORDERS_ADMIN_PASSWORD || "supersecret"
  
  const data = await apiFetch(baseUrl, "/auth/user/emailpass", {
    method: "POST",
    body: { email, password },
  })
  return data.token
}

// --- Main ---

export default async function fakeOrders({ container }: ExecArgs) {
  const baseUrl = process.env.MEDUSA_BACKEND_URL || config.baseUrl
  const orderCount = intArg("orders", config.orderCount)
  const abandonedCount = intArg("abandoned", 0)
  const lateCount = intArg("late", 0)
  const expectMinutes = intArg("expect-minutes", EXPECTED_DELIVERY_MINUTES)
  const backDay = intArg("back_day", 0)
  const spread = intArg("spread", 0)
  const trend = parseArg("trend") || "none"
  const randomHour = parseArg("random-hour") !== undefined
  const backOffsetMs = Math.max(0, backDay) * 24 * 60 * 60 * 1000

  if (abandonedCount + lateCount > orderCount) {
    console.error("Total abandoned and late orders cannot exceed total orders")
    return
  }

  const abandonedIndices = new Set<number>()
  while (abandonedIndices.size < abandonedCount) {
    abandonedIndices.add(Math.floor(Math.random() * orderCount))
  }

  const lateIndices = new Set<number>()
  while (lateIndices.size < lateCount) {
    const randIndex = Math.floor(Math.random() * orderCount)
    if (!abandonedIndices.has(randIndex)) {
      lateIndices.add(randIndex)
    }
  }

  if (abandonedCount > 0) console.log(`Targeting ${abandonedCount} abandoned cart(s) at indices: ${[...abandonedIndices].join(",")}`)
  if (lateCount > 0) console.log(`Targeting ${lateCount} late delivery(ies) at indices: ${[...lateIndices].join(",")}`)
  console.log(`Time window: back_day=${backDay}, spread=${spread}, trend=${trend}, random_hour=${randomHour}`)

  // Load variants
  const variantsPath = path.resolve(__dirname, "variants.template.json")
  if (!fs.existsSync(variantsPath)) {
    console.error("variants.template.json not found")
    return
  }
  const variantsPool: { variant_id: string; quantity?: number }[] = JSON.parse(
    fs.readFileSync(variantsPath, "utf-8")
  )
  if (!variantsPool.length) {
    console.error("variants.template.json is empty")
    return
  }

  const analytics = container.resolve(Modules.ANALYTICS)
  const adminToken = await adminLogin(baseUrl)

  // Validate variants against published products
  const knownVariantIds = new Set<string>()
  let offset = 0
  const limit = 100
  while (true) {
    const res = await apiFetch(baseUrl, `/store/products?limit=${limit}&offset=${offset}&fields=variants.id`)
    const products = (res as any).products || []
    for (const p of products) {
      for (const v of p.variants || []) knownVariantIds.add(v.id)
    }
    if (products.length < limit) break
    offset += limit
  }

  const validVariants = variantsPool.filter((v) => knownVariantIds.has(v.variant_id))
  if (!validVariants.length) {
    console.error("No valid variants found")
    return
  }
  console.log(`Validated ${validVariants.length}/${variantsPool.length} variants`)

  let success = 0
  let failed = 0

  const nowMs = Date.now()
  const anchorMs = nowMs - backOffsetMs
  const spreadMs = Math.max(0, spread) * 24 * 60 * 60 * 1000

  for (let i = 0; i < orderCount; i++) {
    // 1. Distribution Logic
    const progress = orderCount > 1 ? i / (orderCount - 1) : 1
    let weight = progress
    if (trend === "up") weight = Math.pow(progress, 2)
    else if (trend === "down") weight = 1 - Math.pow(1 - progress, 2)

    // Jitter to make it look human
    let baseJitterMs = randomInt(-10, 10) * 60000 
    if (randomHour) {
      baseJitterMs += randomInt(-12, 12) * 3600000 // +/- 12 hours
    }
    const baseMs = anchorMs + (spreadMs * weight) + baseJitterMs

    // 2. Early delivery calculation for timestamp consistency
    const isOnTime = !lateIndices.has(i)
    const actualMinutes = isOnTime ? randomInt(8, 18) : randomInt(22, 35)

    // 3. Sequential timestamps with realistic minute-based gaps
    const tsCustomer = new Date(baseMs)
    const tsCart = new Date(tsCustomer.getTime() + randomInt(1, 5) * 60000)
    const tsOrder = new Date(tsCart.getTime() + randomInt(2, 10) * 60000)
    const tsFulfillment = new Date(tsOrder.getTime() + (actualMinutes * 60000))

    const email = `fake+${Date.now()}_${i}@example.com`
    const password = config.fixedPassword

    try {
      // 1. Register → get token (actor_id empty)
      const regData = await apiFetch(baseUrl, "/auth/customer/emailpass/register", {
        method: "POST",
        body: { email, password },
      })
      const regToken = regData.token

      // Create customer profile → get customer_id
      const custData = await apiFetch(baseUrl, "/store/customers", {
        method: "POST",
        token: regToken,
        body: { email },
      })
      const customerId = custData.customer?.id
      if (!customerId) throw new Error("Failed to create customer")

      // Login again → token now has correct actor_id
      const loginData = await apiFetch(baseUrl, "/auth/customer/emailpass", {
        method: "POST",
        body: { email, password },
      })
      const token = loginData.token

      // Track: customer.created
      await analytics.track(
        buildCustomerCreated({
          customer_id: customerId,
          email,
          source: "script",
          is_simulated: true,
          timestamp: tsCustomer,
        }) as any
      )

      // 2. Create cart (authenticated → cart gets customer_id)
      const cartData = await apiFetch(baseUrl, "/store/carts", {
        method: "POST",
        token,
        body: {},
      })
      const cart = cartData.cart
      if (!cart?.id) throw new Error("Failed to create cart")

      // Add item
      const variant = pickRandom(validVariants)
      await apiFetch(baseUrl, `/store/carts/${cart.id}/line-items`, {
        method: "POST",
        token,
        body: { variant_id: variant.variant_id, quantity: variant.quantity ?? 1 },
      })

      // Set address + email
      await apiFetch(baseUrl, `/store/carts/${cart.id}`, {
        method: "POST",
        token,
        body: {
          email,
          shipping_address: config.shippingAddress,
          billing_address: config.billingAddress,
        },
      })

      // Track: cart.created
      await analytics.track(
        buildCartCreated({
          customer_id: customerId,
          email,
          cart_id: cart.id,
          currency_code: cart.currency_code,
          source: "script",
          is_simulated: true,
          timestamp: tsCart,
        }) as any
      )

      // Decide: cart-only (abandoned) or full flow
      const isCartOnly = abandonedIndices.has(i)

      if (isCartOnly) {
        console.log(
          `[OK] #${i + 1} email=${email} cart=${cart.id} CART-ONLY (abandoned)`
        )
        success++
        continue
      }

      // 3. Add shipping method
      try {
        const soRes = await apiFetch(baseUrl, `/store/shipping-options?cart_id=${cart.id}`, { token })
        const options = (soRes as any).shipping_options || []
        const chosen = options.find((s: any) => s.name === config.shippingOptionName) || options[0]
        if (chosen) {
          await apiFetch(baseUrl, `/store/carts/${cart.id}/shipping-methods`, {
            method: "POST",
            token,
            body: { option_id: chosen.id },
          })
        }
      } catch {
        // ignore
      }

      // 4. Init payment collection + COD session
      const payColRes = await apiFetch(baseUrl, "/store/payment-collections", {
        method: "POST",
        token,
        body: { cart_id: cart.id },
      })
      const payColId = payColRes.payment_collection?.id
      if (payColId) {
        await apiFetch(baseUrl, `/store/payment-collections/${payColId}/payment-sessions`, {
          method: "POST",
          token,
          body: { provider_id: config.paymentProviderId },
        })
      }

      // 5. Complete cart → place order
      const completeRes = await apiFetch(baseUrl, `/store/carts/${cart.id}/complete`, {
        method: "POST",
        token,
        body: {},
      })
      const order = (completeRes as any).order
      if (!order?.id) throw new Error("Failed to complete cart")

      // Track: order.placed
      await analytics.track(
        buildOrderPlaced({
          customer_id: customerId,
          email,
          order_id: order.id,
          cart_id: cart.id,
          total: order.total,
          currency_code: order.currency_code,
          items_count: order.items?.length,
          source: "script",
          is_simulated: true,
          timestamp: tsOrder,
        }) as any
      )

      // 6. Admin: create fulfillment — use items from complete response
      const fulfillmentItems = (order.items || []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
      }))

      let locationId: string | undefined
      try {
        const locRes = await apiFetch(baseUrl, "/admin/stock-locations?limit=1", { token: adminToken })
        locationId = locRes.stock_locations?.[0]?.id
      } catch {
        // ignore
      }
      if (!locationId) {
        console.log(`[WARN] No stock location, skipping fulfillment for order ${order.id}`)
        success++
        continue
      }

      await apiFetch(baseUrl, `/admin/orders/${order.id}/fulfillments`, {
        method: "POST",
        token: adminToken,
        body: { location_id: locationId, items: fulfillmentItems },
      })

      // Get fulfillment ID
      const updatedOrder = await apiFetch(baseUrl, `/admin/orders/${order.id}?fields=fulfillments.*`, { token: adminToken })
      const fulfillments = updatedOrder.order?.fulfillments || []
      const fulfillment = fulfillments[fulfillments.length - 1]
      if (!fulfillment?.id) throw new Error("No fulfillment found")

      // 6. Mark shipped
      await apiFetch(baseUrl, `/admin/orders/${order.id}/fulfillments/${fulfillment.id}/shipments`, {
        method: "POST",
        token: adminToken,
        body: { items: fulfillmentItems },
      })

      // 7. Mark delivered
      await apiFetch(baseUrl, `/admin/orders/${order.id}/fulfillments/${fulfillment.id}/mark-as-delivered`, {
        method: "POST",
        token: adminToken,
        body: {},
      })

      // 8. Track: fulfillment.delivered
      await analytics.track(
        buildFulfillmentDelivered({
          customer_id: customerId,
          email,
          order_id: order.id,
          fulfillment_id: fulfillment.id,
          expected_delivery_minutes: expectMinutes,
          actual_delivery_minutes: actualMinutes,
          source: "script",
          is_simulated: true,
          timestamp: tsFulfillment,
        }) as any
      )

      console.log(
        `[OK] #${i + 1} email=${email} order=${order.id} delivery=${actualMinutes}min ${isOnTime ? "ON-TIME" : "LATE"}`
      )
      success++
    } catch (err: any) {
      failed++
      console.log(`[FAIL] #${i + 1} email=${email} error=${err.message}`)
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`success: ${success}`)
  console.log(`failed: ${failed}`)
  console.log(`abandoned target: ${abandonedCount}`)
  console.log(`late target: ${lateCount}`)
  console.log(`expect-minutes: ${expectMinutes}`)
}
