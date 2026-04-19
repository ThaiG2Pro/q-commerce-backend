import { createCustomerAccountWorkflow, createCustomersWorkflow } from "@medusajs/core-flows"
import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { AuthIdentityDTO } from "@medusajs/framework/types"
import type { PostStoreCustomersBody } from "../../middlewares"
import { refetchEntity } from "../_shared/refetch"

const PLACEHOLDER_EMAILS = new Set(["guest@example.com"])

function splitName(name?: unknown): { first_name?: string; last_name?: string } {
  if (typeof name !== "string" || !name.trim()) {
    return {}
  }

  const normalized = name.trim().split(/\s+/)
  if (normalized.length === 1) {
    return { first_name: normalized[0] }
  }

  return {
    first_name: normalized[0],
    last_name: normalized.slice(1).join(" "),
  }
}

function isPlaceholderEmail(email?: string): boolean {
  if (!email) {
    return true
  }

  if (PLACEHOLDER_EMAILS.has(email)) {
    return true
  }

  return email.endsWith("@miniapp.local")
}

function getZaloIdentity(authIdentity?: AuthIdentityDTO) {
  return authIdentity?.provider_identities?.find(
    (identity) =>
      identity.provider === "zalo" ||
      identity.provider_metadata?.provider === "zalo"
  )
}

export async function POST(req: MedusaStoreRequest<PostStoreCustomersBody>, res: MedusaResponse) {
  const authContext = req.auth_context

  if (authContext?.actor_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Request already authenticated as a customer."
    )
  }

  const customerData: PostStoreCustomersBody = {
    ...req.validatedBody,
  }
  const authIdentityId = authContext?.auth_identity_id

  if (authIdentityId) {
    const authService = req.scope.resolve(Modules.AUTH)
    const authIdentity = (await authService.retrieveAuthIdentity(authIdentityId, {
      relations: ["provider_identities"],
    })) as AuthIdentityDTO

    const zaloIdentity = getZaloIdentity(authIdentity)
    const metadata = zaloIdentity?.user_metadata ?? {}
    const zaloId =
      typeof metadata.zalo_id === "string" && metadata.zalo_id.length
        ? metadata.zalo_id
        : undefined

    if (isPlaceholderEmail(customerData.email) && zaloId) {
      customerData.email = `zalo_${zaloId}@miniapp.local`
    }

    if (!customerData.first_name || !customerData.last_name) {
      const parsedName = splitName(metadata.name)
      customerData.first_name = customerData.first_name || parsedName.first_name
      customerData.last_name = customerData.last_name || parsedName.last_name
    }

    const { result } = await createCustomerAccountWorkflow(req.scope).run({
      input: {
        customerData,
        authIdentityId,
      },
    })

    const customer = await refetchEntity(req, "customer", result.id)
    if (!customer) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Customer with id: ${result.id} was not found`
      )
    }

    return res.status(200).json({ customer })
  }

  // Create customer without auth identity
  const { result: customers } = await createCustomersWorkflow(req.scope).run({
    input: {
      customersData: [customerData],
    },
  })

  const customer = customers[0]
  const refetched = await refetchEntity(req, "customer", customer.id)
  if (!refetched) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer with id: ${customer.id} was not found`
    )
  }

  res.status(200).json({ customer: refetched })
}
