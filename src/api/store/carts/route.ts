import { createCartWorkflow } from "@medusajs/core-flows"
import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { PostStoreCartsBody } from "../../middlewares"
import { refetchEntity } from "../_shared/refetch"

export async function POST(req: MedusaStoreRequest<PostStoreCartsBody>, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const workflowInput = {
    ...req.validatedBody,
    customer_id: req.auth_context?.actor_id,
  }

  try {
    const { result } = await createCartWorkflow(req.scope).run({
      input: workflowInput,
    })

    const cart = await refetchEntity(req, "cart", result.id)
    if (!cart) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart with id: ${result.id} was not found`
      )
    }

    res.status(200).json({ cart })
  } catch (error) {
    logger.error(error)
    logger.error(
      `POST /store/carts failed (region_id=${workflowInput.region_id || "n/a"}, customer_id=${workflowInput.customer_id || "guest"}, currency_code=${workflowInput.currency_code || "n/a"})`
    )
    throw error
  }
}
