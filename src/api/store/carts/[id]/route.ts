import { updateCartWorkflowId } from "@medusajs/core-flows"
import { MedusaRequest, MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import type { PostStoreCartByIdBody } from "../../../middlewares"
import { refetchEntity } from "../../_shared/refetch"
import { updateGuestCart } from "../_shared/guest-cart"

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
  const actorId = req.auth_context?.actor_id

  try {
    if (actorId) {
      const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE)
      await workflowEngine.run(updateCartWorkflowId, {
        input: {
          ...req.validatedBody,
          id: req.params.id,
          additional_data: req.validatedBody.additional_data,
          customer_id: actorId,
        },
      })
    } else {
      await updateGuestCart(req, req.params.id)
    }

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
