import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
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

  const profileResponse = await fetch(`${baseUrl}/store/customers/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (!profileResponse.ok) {
    // For newly-authenticated users without actor_id, profile might not exist yet.
    const fallbackCustomer = buildCustomerShape(authData.customer)

    return res.status(200).json({
      ...normalizedAuthData,
      customer: fallbackCustomer || authData.customer || null,
    })
  }

  const profileData = await readJsonSafe(profileResponse)
  const normalizedCustomer =
    buildCustomerShape(profileData.customer) ||
    buildCustomerShape(profileData) ||
    buildCustomerShape(authData.customer)

  return res.status(200).json({
    ...normalizedAuthData,
    customer: normalizedCustomer || null,
    profile: profileData.customer ?? profileData,
  })
}
