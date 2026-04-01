import { loadEnv, defineConfig, Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'
import path from "path"

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
      authMethodsPerActor: {
        user: ["emailpass"],
        customer: ["emailpass", "zalo"],
      },
    }
  },
  admin: {
    disable: isProduction,
  },
  modules: {
    // 1. Phần Redis: Chỉ "trải" vào nếu thỏa mãn điều kiện
    ...(process.env.REDIS_URL && !process.env.REDIS_URL.includes('_ro') ? {
      [Modules.EVENT_BUS]: {
        resolve: "@medusajs/event-bus-redis",
        options: {
          redisUrl: process.env.REDIS_URL,
          redisOptions: { enableReadyCheck: false },
        },
      },
      [Modules.CACHE]: {
        resolve: "@medusajs/cache-redis",
        options: {
          redisUrl: process.env.REDIS_URL,
          redisOptions: { enableReadyCheck: false },
        },
      },
      [Modules.WORKFLOW_ENGINE]: {
        resolve: "@medusajs/workflow-engine-redis",
        options: {
          redis: {
            redisUrl: process.env.REDIS_URL,
            redisOptions: { enableReadyCheck: false },
          },
        },
      },
    } : {}),

    // 2. Phần AUTH: Nằm TRONG object modules nhưng NGOÀI ngoặc đơn của Redis
    // Nó sẽ luôn luôn được load bất kể có Redis hay không
    [Modules.AUTH]: {
      resolve: "@medusajs/medusa/auth",
      dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass", 
            id: "emailpass" 
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
  } // Kết thúc object modules
})

export default config