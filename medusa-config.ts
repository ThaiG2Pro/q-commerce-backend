import { loadEnv, defineConfig, Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const isProduction = process.env.NODE_ENV === "production"

const config = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    databaseDriverOptions: isProduction ? {
      connection: {
        ssl: {
          rejectUnauthorized: false,
        },
      },
      pool: {
        min: 0,
        max: 7,
        acquireTimeoutMillis: 300000,
        createTimeoutMillis: 300000,
        idleTimeoutMillis: 30000,
      },
    } : {},
    http: {
      storeCors: process.env.STORE_CORS || "",
      adminCors: process.env.ADMIN_CORS || "",
      authCors: process.env.AUTH_CORS || "",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      authMethodsPerActor: {
        user: ["emailpass"],
        customer: ["emailpass", "zalo"],
      },
    },
  },
  admin: {
    disable: isProduction,
  },
  modules: [
    // Redis modules — only registered when REDIS_URL is available and not read-only
    ...(process.env.REDIS_URL && !process.env.REDIS_URL.includes('_ro') ? [
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
          {
            resolve: "./src/modules/zalo-auth",
            id: "zalo",
            options: {
              appSecret: process.env.ZALO_APP_SECRET,
            },
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
            resolve: "./src/modules/zalo-payment",
            id: "zalopay",
            options: {
              app_id: process.env.ZALOPAY_APP_ID,
              key1: process.env.ZALOPAY_KEY1,
              key2: process.env.ZALOPAY_KEY2,
              is_sandbox: process.env.ZALOPAY_IS_SANDBOX === "true",
            },
          },
        ],
      },
    },
  ],
})

export default config
