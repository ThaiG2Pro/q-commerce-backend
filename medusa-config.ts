import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const isProduction = process.env.NODE_ENV === "production"

const config = defineConfig({
  projectConfig: {
    // Để cho driver tự xử lý URL đầy đủ (bao gồm sslmode=require từ Neon)
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
    }
  },
  modules: (process.env.REDIS_URL && !process.env.REDIS_URL.includes('_ro')) ? {
    [Modules.EVENT_BUS]: {
      resolve: "@medusajs/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    [Modules.CACHE]: {
      resolve: "@medusajs/cache-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    [Modules.WORKFLOW_ENGINE]: {
      resolve: "@medusajs/workflow-engine-redis",
      options: {
        redis: {
          url: process.env.REDIS_URL,
        },
      },
    },
  } : {
    // Use in-memory modules when Redis is not available or read-only
    // This allows the app to start even without Redis
  }
})

export default config
