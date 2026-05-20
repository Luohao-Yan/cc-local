import { z } from 'zod/v4'

export interface SandboxFilesystemConfig {
  allowRead?: string[]
  allowWrite?: string[]
  allowExec?: string[]
  denyRead?: string[]
  denyWrite?: string[]
  allowManagedReadPathsOnly?: boolean
}

export interface SandboxNetworkConfig {
  allowDomains?: string[]
  denyDomains?: string[]
  allowManagedDomainsOnly?: boolean
  allowUnixSockets?: string[]
  allowAllUnixSockets?: boolean
  allowLocalBinding?: boolean
  httpProxyPort?: number
  socksProxyPort?: number
}

export interface SandboxIgnoreViolations {
  filesystem?: string[]
  network?: string[]
}

export interface SandboxRipgrepConfig {
  command?: string
  args?: string[]
  argv0?: string
}

export interface SandboxSettings {
  enabled?: boolean
  filesystem?: SandboxFilesystemConfig
  network?: SandboxNetworkConfig
  ignoreViolations?: SandboxIgnoreViolations
  ripgrep?: SandboxRipgrepConfig
  autoAllowBashIfSandboxed?: boolean
  allowUnsandboxedCommands?: boolean
  failIfUnavailable?: boolean
  enableWeakerNestedSandbox?: boolean
  enableWeakerNetworkIsolation?: boolean
  excludedCommands?: string[]
  enabledPlatforms?: string[]
  bwrapPath?: string
  socatPath?: string
}

export const SandboxSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  filesystem: z.object({
    allowRead: z.array(z.string()).optional(),
    allowWrite: z.array(z.string()).optional(),
    allowExec: z.array(z.string()).optional(),
    denyRead: z.array(z.string()).optional(),
    denyWrite: z.array(z.string()).optional(),
    allowManagedReadPathsOnly: z.boolean().optional(),
  }).optional(),
  network: z.object({
    allowDomains: z.array(z.string()).optional(),
    denyDomains: z.array(z.string()).optional(),
    allowManagedDomainsOnly: z.boolean().optional(),
    allowUnixSockets: z.array(z.string()).optional(),
    allowAllUnixSockets: z.boolean().optional(),
    allowLocalBinding: z.boolean().optional(),
    httpProxyPort: z.number().optional(),
    socksProxyPort: z.number().optional(),
  }).optional(),
  ignoreViolations: z.object({
    filesystem: z.array(z.string()).optional(),
    network: z.array(z.string()).optional(),
  }).optional(),
  ripgrep: z.object({
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    argv0: z.string().optional(),
  }).optional(),
  autoAllowBashIfSandboxed: z.boolean().optional(),
  allowUnsandboxedCommands: z.boolean().optional(),
  failIfUnavailable: z.boolean().optional(),
  enableWeakerNestedSandbox: z.boolean().optional(),
  enableWeakerNetworkIsolation: z.boolean().optional(),
  excludedCommands: z.array(z.string()).optional(),
  enabledPlatforms: z.array(z.string()).optional(),
  bwrapPath: z.string().optional().describe('Custom path to the bwrap sandbox binary (Linux/WSL)'),
  socatPath: z.string().optional().describe('Custom path to the socat binary for sandbox networking (Linux/WSL)'),
}).optional()
