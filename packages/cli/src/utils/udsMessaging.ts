/** Unix domain socket messaging server (UDS_INBOX feature). */

export function getDefaultUdsSocketPath(): string {
  return ''
}

export function getUdsMessagingSocketPath(): string | undefined {
  return undefined
}

export async function startUdsMessaging(
  _socketPath: string,
  _options?: { isExplicit?: boolean; [key: string]: unknown },
): Promise<void> {}

export function setOnEnqueue(_callback: () => void): void {}
