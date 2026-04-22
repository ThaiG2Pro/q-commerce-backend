import { loadEnv, defineConfig, Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const isProduction = process.env.NODE_ENV === "production"
const isRedisEnabled =
  !!process.env.REDIS_URL &&
  process.env.ENABLE_REDIS_MODULES !== "false" &&
  !process.env.REDIS_URL.includes("_ro")

const config = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    databaseDriverOptions: {
      connection: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
      pool: {
        min: 0,
        max: 30,
        acquireTimeoutMillis: 300000,
        createTimeoutMillis: 300000,
        idleTimeoutMillis: 30000,
      },
    },
    http: {
      storeCors: process.env.STORE_CORS || "",
      adminCors: process.env.ADMIN_CORS || "",
      authCors: process.env.AUTH_CORS || "",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      authMethodsPerActor: {
        user: ["emailpass"],
        customer: ["emailpass"],
      },
    },
  },
  admin: {
    disable: isProduction,
  },
  modules: [
    // Redis modules — can be disabled with ENABLE_REDIS_MODULES=false
    ...(isRedisEnabled ? [
      {
        resolve: "@medusajs/medusa/event-bus-redis",
        options: {
          redisUrl: process.env.REDIS_URL,
          redisOptions: { enableReadyCheck: false },
        },
      },
      {
        resolve: "@medusajs/medusa/caching",
        options: {
          providers: [
            {
              resolve: "@medusajs/caching-redis",
              id: "caching-redis",
              is_default: true,
              options: {
                redisUrl: process.env.REDIS_URL,
              },
            },
          ],
        },
      },
      {
        resolve: "@medusajs/medusa/workflow-engine-redis",
        options: {
          redis: {
            redisUrl: process.env.REDIS_URL,
          },
        },
      },
    ] : []),

    // Auth Module
    {
      resolve: "@medusajs/medusa/auth",
      dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
        ],
      },
    },

    // Payment Module
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/cod-payment",
            id: "cod",
            options: {},
          },
          {
            resolve: "./src/modules/qr-payment",
            id: "qr",
            options: {
              qr_code_url: process.env.QR_CODE_URL,
            },
          },

        ],
      },
    },

    // Fulfillment Module
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "./src/modules/inhouse-fulfillment",
            id: "inhouse-fulfillment",
            options: {
              default_warehouse_address: process.env.WAREHOUSE_ADDRESS || "123 Main Street, HCM City",
              contact_phone: process.env.WAREHOUSE_PHONE || "+84123456789",
              contact_email: process.env.WAREHOUSE_EMAIL || "warehouse@company.com",
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/products-media",
    },
    {
      resolve: "@medusajs/medusa/analytics",
      options: {
        providers: [
          {
            resolve: "@medusajs/analytics-posthog",
            id: "posthog",
            options: {
              posthogEventsKey: process.env.POSTHOG_EVENTS_API_KEY,
              posthogHost: process.env.POSTHOG_HOST,
            },
          },
        ],
      },
    },
  ],
})

export default config
