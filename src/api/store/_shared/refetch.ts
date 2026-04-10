import { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"

type QueryResult<T> = T[]

export async function refetchEntity<T>(
  req: MedusaRequest,
  entity: string,
  id: string
): Promise<T | undefined> {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: entity,
    variables: { filters: { id } },
    fields: req.queryConfig?.fields,
  })

  const result = (await remoteQuery(queryObject)) as QueryResult<T>
  return result[0]
}
