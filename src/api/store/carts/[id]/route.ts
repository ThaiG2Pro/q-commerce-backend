import { updateCartWorkflowId } from "@medusajs/core-flows"
import { MedusaRequest, MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import type { PostStoreCartByIdBody } from "../../../middlewares"
import { refetchEntity } from "../../_shared/refetch"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cart = await refetchEntity(req, "cart", req.params.id)
  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id: ${req.params.id} was not found`
    )
  }

  res.json({ cart })
}

export async function POST(req: MedusaStoreRequest<PostStoreCartByIdBody>, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE)
  const actorId = req.auth_context?.actor_id
  const workflowInput = {
    ...req.validatedBody,
    id: req.params.id,
    additional_data: req.validatedBody.additional_data,
    ...(actorId ? { customer_id: actorId } : {}),
  }

  try {
    await workflowEngine.run(updateCartWorkflowId, {
      input: workflowInput,
    })

    const cart = await refetchEntity(req, "cart", req.params.id)
    if (!cart) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart with id: ${req.params.id} was not found`
      )
    }

    res.status(200).json({ cart })
  } catch (error) {
    logger.error(error)
    logger.error(
      `POST /store/carts/${req.params.id} failed (keys=${Object.keys(req.validatedBody || {}).join(",") || "none"})`
    )
    throw error
  }
}
