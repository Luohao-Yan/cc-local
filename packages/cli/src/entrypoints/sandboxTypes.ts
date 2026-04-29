import { z } from 'zod/v4'

export interface SandboxFilesystemConfig {
  allowRead?: string[]
  allowWrite?: string[]
  allowExec?: string[]
}

export interface SandboxNetworkConfig {
  allowDomains?: string[]
  denyDomains?: string[]
}

export interface SandboxIgnoreViolations {
  filesystem?: string[]
  network?: string[]
}

export interface SandboxSettings {
  enabled?: boolean
  filesystem?: SandboxFilesystemConfig
  network?: SandboxNetworkConfig
  ignoreViolations?: SandboxIgnoreViolations
}

export const SandboxSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  filesystem: z.object({
    allowRead: z.array(z.string()).optional(),
    allowWrite: z.array(z.string()).optional(),
    allowExec: z.array(z.string()).optional(),
  }).optional(),
  network: z.object({
    allowDomains: z.array(z.string()).optional(),
    denyDomains: z.array(z.string()).optional(),
  }).optional(),
  ignoreViolations: z.object({
    filesystem: z.array(z.string()).optional(),
    network: z.array(z.string()).optional(),
  }).optional(),
}).optional()
