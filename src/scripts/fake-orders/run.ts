import Medusa from "@medusajs/js-sdk"
import fs from "fs"
import path from "path"
import config from "./config.template"

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`
  const arg = process.argv.find((a) => a.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : undefined
}

function parseIntArg(name: string, defaultValue: number) {
  const v = parseArg(name)
  return v ? parseInt(v, 10) : defaultValue
}

function parseBool(raw: string | undefined, defaultValue = false) {
  if (raw === undefined) return defaultValue
  return raw.toLowerCase() !== "false"
}

function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {
  const baseUrl = process.env.MEDUSA_BACKEND_URL || config.baseUrl
  const orders = parseIntArg("orders", parseInt(process.env.FAKE_ORDERS || "1"))
  const accounts = parseIntArg("accounts", parseInt(process.env.FAKE_ACCOUNTS || String(orders)))
  const cartOnly = parseBool(parseArg("cartOnly"), false)

  const variantsPath = path.resolve(__dirname, "variants.template.json")
  if (!fs.existsSync(variantsPath)) {
    console.error("variants.template.json not found in script folder")
    process.exit(1)
  }

  const variantsRaw = fs.readFileSync(variantsPath, "utf-8")
  const variantsPool: { variant_id: string; quantity?: number }[] = JSON.parse(variantsRaw)
  if (!variantsPool.length) {
    console.error("variants.template.json is empty")
    process.exit(1)
  }

  const sdk = new Medusa({
    baseUrl,
    publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY || (config as any).publishableKey,
  })

  let success = 0
  let failed = 0

  for (let i = 0; i < orders; i++) {
    try {
      const accountIdx = i % accounts
      const email = `fake+${Date.now()}_${i}_${accountIdx}@example.com`
      const password = (config as any).defaultPassword || (config as any).fixedPassword || process.env.FAKE_CUSTOMER_PASSWORD || "password"

      // register customer
      try {
        await sdk.client.fetch("/auth/customer/emailpass/register", {
          method: "POST",
          body: {
            email,
            password,
          },
        })
      } catch (e) {
        // ignore if already exists or registration blocked
      }

      // login customer to create a store session
      try {
        await sdk.auth.login("user", "emailpass", { email, password })
      } catch (e) {
        // login may redirect; ignore and continue as anonymous cart if needed
      }

      // create cart
      const cartCreate = await sdk.client.fetch("/store/carts", {
        method: "POST",
        body: {},
      })
      const cart = (cartCreate as any).cart
      if (!cart?.id) throw new Error("Failed to create cart")

      // add a random variant with retry on inventory errors
      const maxAttempts = variantsPool.length
      let added = false
      let lastAddError: any = null
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const variant = variantsPool[(i + attempt) % variantsPool.length]
        const quantity = variant.quantity ?? 1
        try {
          await sdk.client.fetch(`/store/carts/${cart.id}/line-items`, {
            method: "POST",
            body: {
              variant_id: variant.variant_id,
              quantity,
            },
          })
          added = true
          break
        } catch (err: any) {
          lastAddError = err
          const msg = err?.message || String(err)
          if (!/inventory/i.test(msg)) {
            // non-inventory error -> rethrow
            throw err
          }
          // otherwise try next variant
        }
      }
      if (!added) {
        throw lastAddError || new Error("Failed to add any variant due to inventory")
      }

      // set shipping + billing addresses and customer email
      const address = (config as any).defaultAddress || (config as any).shippingAddress || (config as any).billingAddress
      if (address) {
        await sdk.client.fetch(`/store/carts/${cart.id}`, {
          method: "POST",
          body: {
            email,
            shipping_address: address,
            billing_address: address,
          },
        })
      }

      if (!cartOnly) {
        // try to list shipping options and add one by name
        try {
          const soResp = await sdk.client.fetch(`/store/shipping-options?cart_id=${cart.id}`, {
            method: "GET",
          })
          const shippingOptions = (soResp as any).shipping_options || []
          const chosen = shippingOptions.find((s: any) => s.name === config.shippingOptionName) || shippingOptions[0]
          if (chosen) {
            await sdk.client.fetch(`/store/carts/${cart.id}/shipping-methods`, {
              method: "POST",
              body: { option_id: chosen.id },
            })
          }
        } catch (e) {
          // ignore
        }

        // try to initiate payment session for configured provider (best-effort)
        try {
          await sdk.client.fetch(`/store/payment-collections`, {
            method: "POST",
            body: {},
          })
        } catch (e) {
          // ignore
        }

        // try to complete cart
        try {
          await sdk.client.fetch(`/store/carts/${cart.id}/complete`, {
            method: "POST",
            body: {},
          })
        } catch (e) {
          // completing may fail (inventory/payment) - still count as partial success
        }
      }

      console.log(`[OK] created order/cart for ${email} cart=${cart.id}`)
      success += 1
    } catch (err) {
      failed += 1
      console.log(`[FAIL] index=${i} error=${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log("\n=== Summary ===")
  console.log(`success: ${success}`)
  console.log(`failed: ${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
