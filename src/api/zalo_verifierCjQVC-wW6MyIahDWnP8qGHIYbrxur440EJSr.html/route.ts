import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

const verificationFilePath = join(
  process.cwd(),
  "zalo_verifierCjQVC-wW6MyIahDWnP8qGHIYbrxur440EJSr.html"
)

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const html = await readFile(verificationFilePath, "utf8")

  res.setHeader("Content-Type", "text/html; charset=utf-8")
  res.status(200).send(html)
}
