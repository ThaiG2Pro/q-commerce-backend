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

  const sdk = new Medusa({ baseUrl })

  let success = 0
  let failed = 0

  for (let i = 0; i < orders; i++) {
    try {
      const accountIdx = i % accounts
      const email = `fake+${Date.now()}_${i}_${accountIdx}@example.com`
      const password = config.defaultPassword || "password"

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

      // add a random variant
      const variant = pickRandom(variantsPool)
      const quantity = variant.quantity ?? 1
      await sdk.client.fetch(`/store/carts/${cart.id}/line-items`, {
        method: "POST",
        body: {
          variant_id: variant.variant_id,
          quantity,
        },
      })

      // set shipping + billing addresses and customer email
      const address = config.defaultAddress
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
