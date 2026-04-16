import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import QRPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [QRPaymentProviderService],
})
