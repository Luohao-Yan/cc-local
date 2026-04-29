/** Stubs: `ps` / `logs` / `attach` / `kill` / `--bg` session registry (`cli.tsx`). */

export async function psHandler(_args: string[]): Promise<void> {}

export async function logsHandler(_sessionId: string | undefined): Promise<void> {}

export async function attachHandler(_sessionId: string | undefined): Promise<void> {}

export async function killHandler(_sessionId: string | undefined): Promise<void> {}

export async function handleBgFlag(_args: string[]): Promise<void> {}
