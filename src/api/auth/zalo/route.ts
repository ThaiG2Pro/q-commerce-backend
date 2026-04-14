import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { PostAuthZaloBody } from "../../middlewares"

type CustomerAuthResponse = {
  customer?: {
    id?: string
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    phone?: string | null
    metadata?: Record<string, unknown>
    token?: string
  }
  token?: string
  accessToken?: string
  access_token?: string
  jwt?: string
  [key: string]: unknown
}

type CustomerContractShape = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  metadata: Record<string, unknown>
}

function getBaseUrl(req: MedusaRequest): string {
  const forwardedProtoHeader = req.headers["x-forwarded-proto"]
  const forwardedProto =
    Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader?.split(",")[0]?.trim()

  const protocol = forwardedProto || req.protocol || "http"
  const host = req.headers.host

  if (!host) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Missing host header")
  }

  return `${protocol}://${host}`
}

function parseToken(payload: CustomerAuthResponse): string | undefined {
  if (typeof payload.token === "string" && payload.token) {
    return payload.token
  }

  if (typeof payload.accessToken === "string" && payload.accessToken) {
    return payload.accessToken
  }

  if (typeof payload.access_token === "string" && payload.access_token) {
    return payload.access_token
  }

  if (typeof payload.jwt === "string" && payload.jwt) {
    return payload.jwt
  }

  const customer = payload.customer
  if (!customer || typeof customer !== "object") {
    return undefined
  }

  return typeof customer.token === "string" ? customer.token : undefined
}

async function fetchCustomerProfile(
  baseUrl: string,
  token: string,
  publishableApiKey?: string
): Promise<{ ok: boolean; data?: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  if (publishableApiKey) {
    headers["x-publishable-api-key"] = publishableApiKey
  }

  const profileResponse = await fetch(`${baseUrl}/store/customers/me`, {
    method: "GET",
    headers,
  })

  if (!profileResponse.ok) {
    return { ok: false }
  }

  return {
    ok: true,
    data: await readJsonSafe(profileResponse),
  }
}

function readHeaderValue(req: MedusaRequest, headerName: string): string | undefined {
  const headerValue = req.headers[headerName]

  if (Array.isArray(headerValue)) {
    return headerValue[0]
  }

  return typeof headerValue === "string" && headerValue.trim() ? headerValue : undefined
}

async function resolvePublishableApiKey(req: MedusaRequest): Promise<string | undefined> {
  const fromHeader = readHeaderValue(req, "x-publishable-api-key")
  if (fromHeader) {
    return fromHeader
  }

  const fromEnv =
    process.env.MEDUSA_PUBLISHABLE_KEY ||
    process.env.STORE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

  if (fromEnv) {
    return fromEnv
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = (await query.graph({
      entity: "api_key",
      fields: ["token", "id"],
      filters: {
        type: "publishable",
      },
      pagination: {
        take: 1,
      },
    })) as { data: Array<Record<string, unknown>> }

    const token = data?.[0]?.token
    if (typeof token === "string" && token) {
      return token
    }
  } catch {
    return undefined
  }

  return undefined
}

async function readJsonSafe(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text()

  try {
    return JSON.parse(text)
  } catch {
    return { message: text || "Unknown response" }
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function buildCustomerShape(value: unknown): CustomerContractShape | undefined {
  const customer = asRecord(value)
  if (!customer) {
    return undefined
  }

  const id = typeof customer.id === "string" ? customer.id : undefined
  if (!id) {
    return undefined
  }

  const metadata =
    customer.metadata && typeof customer.metadata === "object"
      ? (customer.metadata as Record<string, unknown>)
      : {}

  return {
    id,
    first_name: asNullableString(customer.first_name),
    last_name: asNullableString(customer.last_name),
    email: asNullableString(customer.email),
    phone: asNullableString(customer.phone),
    metadata,
  }
}

export async function POST(req: MedusaRequest<PostAuthZaloBody>, res: MedusaResponse) {
  const accessToken = req.validatedBody.access_token || req.validatedBody.accessToken

  if (!accessToken) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "access_token or accessToken is required"
    )
  }

  const baseUrl = getBaseUrl(req)
  const publishableApiKey = await resolvePublishableApiKey(req)
  const authResponse = await fetch(`${baseUrl}/auth/customer/zalo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: accessToken,
    }),
  })

  const authData = (await readJsonSafe(authResponse)) as CustomerAuthResponse

  if (!authResponse.ok) {
    return res.status(authResponse.status).json(authData)
  }

  const token = parseToken(authData)
  if (!token) {
    return res.status(200).json(authData)
  }

  const normalizedAuthData = {
    ...authData,
    token,
    accessToken: token,
    access_token: token,
    jwt: token,
  }

  let activeToken = token
  let profileResult = await fetchCustomerProfile(baseUrl, activeToken, publishableApiKey)

  if (!profileResult.ok) {
    // New user flow: create/find customer from auth identity, then refresh token.
    const customerHeaders: Record<string, string> = {
      Authorization: `Bearer ${activeToken}`,
      "Content-Type": "application/json",
    }

    if (publishableApiKey) {
      customerHeaders["x-publishable-api-key"] = publishableApiKey
    }

    await fetch(`${baseUrl}/store/customers`, {
      method: "POST",
      headers: customerHeaders,
      body: JSON.stringify({}),
    })

    const refreshResponse = await fetch(`${baseUrl}/auth/token/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${activeToken}`,
        "Content-Type": "application/json",
      },
    })

    if (refreshResponse.ok) {
      const refreshData = (await readJsonSafe(refreshResponse)) as CustomerAuthResponse
      const refreshedToken = parseToken(refreshData)

      if (refreshedToken) {
        activeToken = refreshedToken
        profileResult = await fetchCustomerProfile(baseUrl, activeToken, publishableApiKey)
      }
    }
  }

  const finalPayload = {
    ...normalizedAuthData,
    token: activeToken,
    accessToken: activeToken,
    access_token: activeToken,
    jwt: activeToken,
  }

  if (!profileResult.ok || !profileResult.data) {
    const fallbackCustomer = buildCustomerShape(authData.customer)

    return res.status(200).json({
      ...finalPayload,
      customer: fallbackCustomer || authData.customer || null,
    })
  }

  const profileData = profileResult.data
  const normalizedCustomer =
    buildCustomerShape(profileData.customer) ||
    buildCustomerShape(profileData) ||
    buildCustomerShape(authData.customer)

  return res.status(200).json({
    ...finalPayload,
    customer: normalizedCustomer || null,
    profile: profileData.customer ?? profileData,
  })
}
