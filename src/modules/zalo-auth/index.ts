import ZaloAuthProviderService from "./service"
import { ModuleProvider, Modules } from "@medusajs/framework/utils"

export default ModuleProvider(Modules.AUTH, {
  services: [ZaloAuthProviderService],
})













//frontend gửi 1 method post cùng với access token
//sau đó backend sẽ dùng token đó cùng với appsecretproof gọi đến zalo api để
//lấy ra  của người đó và đi kiểm tra trong db, nếu không có thì tạo. và refresh lại accesstoken
//else login cho người đó và trả về 