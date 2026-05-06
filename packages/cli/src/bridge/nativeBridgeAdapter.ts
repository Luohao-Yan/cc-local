/**
 * Native Bridge Adapter for Packages-Native Mode
 *
 * This is a type-only module that defines the interface for bridge adapters
 * in packages-native mode. The actual implementation may vary based on
 * the runtime context.
 */

export interface NativeBridgeAdapter {
  /**
   * The current session ID
   */
  sessionId?: string

  /**
   * Send a message through the bridge
   */
  sendMessage?(message: unknown): Promise<void>

  /**
   * Get the current connection state
   */
  getConnectionState?(): 'connected' | 'disconnected' | 'connecting'

  /**
   * Disconnect the bridge
   */
  disconnect?(): Promise<void>
}
