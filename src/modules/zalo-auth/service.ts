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

type ZaloProfile = {
  id: string
  name?: string
  error?: number
  message?: string
  picture?: {
    data?: {
      url?: string
    }
  }
}

type ZaloProfileResult = {
  profile?: ZaloProfile
  error?: string
}

class ZaloAuthProviderService extends AbstractAuthModuleProvider {
  static identifier = "zalo"
  static DISPLAY_NAME = "Zalo"

  protected options_: Options

  constructor(_: Record<string, unknown>, options: Options) {
    super()
    if (!options?.appSecret) {
      throw new Error("Zalo appSecret is required")
    }
    this.options_ = options
  }

  private validateAccessToken(data: AuthenticationInput): string | null {
    const accessToken = data.body?.access_token

    if (typeof accessToken !== "string" || !accessToken.trim()) {
      return null
    }

    return accessToken
  }

  private buildAppSecretProof(accessToken: string): string {
    return crypto
      .createHmac("sha256", this.options_.appSecret)
      .update(accessToken)
      .digest("hex")
  }

  private parseZaloResponse(bodyText: string): ZaloProfileResult {
    try {
      return { profile: JSON.parse(bodyText) }
    } catch {
      return { error: "Invalid Zalo profile response" }
    }
  }

  private async fetchZaloProfile(
    accessToken: string,
    appsecretProof: string
  ): Promise<ZaloProfileResult> {
    const response = await fetch("https://graph.zalo.me/v2.0/me?fields=id,name,picture", {
      headers: {
        access_token: accessToken,
        appsecret_proof: appsecretProof,
      },
    })

    const bodyText = await response.text()
    const parsed = this.parseZaloResponse(bodyText)
    if (parsed.error || !parsed.profile) {
      return { error: parsed.error || "Invalid Zalo profile response" }
    }

    const profile = parsed.profile

    if (!response.ok) {
      return { error: profile.message || `Zalo API request failed with status ${response.status}` }
    }

    if (profile.error !== 0) {
      return { error: profile.message || "Zalo authentication failed" }
    }

    if (typeof profile.id !== "string" || !profile.id) {
      return { error: "Zalo profile id is missing" }
    }

    return { profile }
  }

  private isNotFoundError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false
    }

    const maybeType = "type" in error ? (error.type as unknown) : undefined
    const maybeMessage = "message" in error ? String(error.message) : ""

    return maybeType === "not_found" || maybeMessage.toLowerCase().includes("not found")
  }

  private async upsertAuthIdentity(
    profile: ZaloProfile,
    authIdentityProviderService: AuthIdentityProviderService
  ) {
    const entityId = profile.id
    const userMetadata = {
      name: profile.name,
      picture: profile.picture?.data?.url,
      zalo_id: entityId,
    }

    try {
      await authIdentityProviderService.retrieve({ entity_id: entityId })
    } catch (error) {
      if (!this.isNotFoundError(error)) {
        throw error
      }

      return authIdentityProviderService.create({
        entity_id: entityId,
        user_metadata: userMetadata,
        provider_metadata: {
          provider: ZaloAuthProviderService.identifier,
        },
      })
    }

    return authIdentityProviderService.update(entityId, {
      user_metadata: userMetadata,
      provider_metadata: {
        provider: ZaloAuthProviderService.identifier,
      },
    })
  }

  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const accessToken = this.validateAccessToken(data)

    if (!accessToken) {
      return { success: false, error: "Zalo access_token is required" }
    }

    const appsecretProof = this.buildAppSecretProof(accessToken)
    const { profile, error } = await this.fetchZaloProfile(accessToken, appsecretProof)

    if (error || !profile) {
      return { success: false, error: error || "Unable to authenticate Zalo account" }
    }

    const authIdentity = await this.upsertAuthIdentity(profile, authIdentityProviderService)
    return { success: true, authIdentity }
  }
}

export default ZaloAuthProviderService
