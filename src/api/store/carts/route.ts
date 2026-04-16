import { createCartWorkflow } from "@medusajs/core-flows"
import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import type { PostStoreCartsBody } from "../../middlewares"
import { refetchEntity } from "../_shared/refetch"
import { createGuestCart } from "./_shared/guest-cart"

export async function POST(req: MedusaStoreRequest<PostStoreCartsBody>, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const actorId = req.auth_context?.actor_id

  try {
    const createdCart = actorId
      ? (await createCartWorkflow(req.scope).run({
          input: {
            ...req.validatedBody,
            customer_id: actorId,
          },
        })).result
      : await createGuestCart(req)

    const cart = await refetchEntity(req, "cart", createdCart.id)
    if (!cart) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart with id: ${createdCart.id} was not found`
      )
    }

    res.status(200).json({ cart })
  } catch (error) {
    logger.error(error)
    logger.error(
      `POST /store/carts failed (region_id=${req.validatedBody.region_id || "n/a"}, customer_id=${actorId || "guest"}, currency_code=${req.validatedBody.currency_code || "n/a"})`
    )
    throw error
  }
}
