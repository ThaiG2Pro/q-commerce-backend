// src/modules/zalo-auth/service.ts
import { AbstractAuthModuleProvider } from "@medusajs/framework/utils"
import {
  AuthIdentityProviderService,
  AuthenticationInput,
  AuthenticationResponse,
} from "@medusajs/framework/types"
import crypto from "crypto"

type Options = {
  appSecret: string
}

class ZaloAuthProviderService extends AbstractAuthModuleProvider {
  static identifier = "zalo"
  static DISPLAY_NAME = "Zalo"

  protected options_: Options

  constructor({}, options: Options) {
    super(...arguments)
    this.options_ = options
  }

  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const accessToken = data.body?.access_token as string

    if (!accessToken) {
      return { success: false, error: "Zalo access_token is required" }
    }

    // Tính appsecret_proof = HMAC-SHA256(access_token, app_secret)
    const appsecretProof = crypto
      .createHmac("sha256", this.options_.appSecret)
      .update(accessToken)
      .digest("hex")

    // Gọi Zalo Open API để lấy profile
    const zaloRes = await fetch("<https://graph.zalo.me/v2.0/me?fields=id,name,picture>", {
      headers: {
        access_token: accessToken,
        appsecret_proof: appsecretProof,
      },
    })

    const profile = await zaloRes.json()

    if (profile.error !== 0) {
      return { success: false, error: profile.message || "Zalo authentication failed" }
    }

    const entityId = profile.id as string // Zalo user ID – duy nhất per App

    // Tạo hoặc lấy auth identity
    let authIdentity
    try {
      authIdentity = await authIdentityProviderService.retrieve({ entity_id: entityId })
      // Cập nhật user_metadata mới nhất
      authIdentity = await authIdentityProviderService.update(entityId, {
        user_metadata: {
          name: profile.name,
          picture: profile.picture?.data?.url,
        },
      })
    } catch (e) {
      authIdentity = await authIdentityProviderService.create({
        entity_id: entityId,
        user_metadata: {
          name: profile.name,
          picture: profile.picture?.data?.url,
        },
      })
    }

    return { success: true, authIdentity }
  }
}

export default ZaloAuthProviderService