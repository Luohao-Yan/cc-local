export type SubscriptionType = 'max' | 'pro' | 'enterprise' | 'team' | 'free' | string
export type RateLimitTier = string | null
export type BillingType = string | null

export interface OAuthTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
  scopes: string[]
  subscriptionType: SubscriptionType | null
  rateLimitTier: RateLimitTier
  profile?: OAuthProfileResponse
  tokenAccount?: {
    uuid: string
    emailAddress: string
    organizationUuid?: string
  }
}

export interface OAuthTokenExchangeResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  account?: Record<string, unknown>
  organization?: Record<string, unknown>
}

export interface OAuthProfileResponse {
  account: {
    uuid: string
    email: string
    display_name?: string
    created_at?: string
  }
  organization?: {
    uuid: string
    organization_type?: string
    rate_limit_tier?: string
    has_extra_usage_enabled?: boolean
    billing_type?: string
    subscription_created_at?: string
  }
}

export interface UserRolesResponse {
  organization_role?: string
  workspace_role?: string
  organization_name?: string
}

export interface ReferralEligibilityResponse {
  eligible: boolean
  referral_code_details?: {
    referral_link: string
    campaign: string
  }
  referrer_reward?: ReferrerRewardInfo
}

export interface ReferralRedemptionsResponse {
  redemptions?: unknown[]
  limit?: number
}

export interface ReferrerRewardInfo {
  [key: string]: unknown
}

export type ReferralCampaign = string
