import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type { PostAuthZaloBody } from "../../middlewares"

type CustomerAuthResponse = {
  customer?: {
    token?: string
  }
  [key: string]: unknown
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

  const profileResponse = await fetch(`${baseUrl}/store/customers/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (!profileResponse.ok) {
    // For newly-authenticated users without actor_id, profile might not exist yet.
    return res.status(200).json(authData)
  }

  const profileData = await readJsonSafe(profileResponse)

  return res.status(200).json({
    ...authData,
    profile: profileData.customer ?? profileData,
  })
}
