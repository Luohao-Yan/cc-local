/**
 * IDE Integration Module
 *
 * 导出 IDE 集成相关的类和类型
 */

export {
  IDEBridge,
  ideBridge,
  type IDEInfo,
  type IDECapabilities,
  type IDEMessage,
  type IDEMessageType,
  type FileEditRequest,
  type FileEditResponse,
  type TerminalOutput,
  type DebugLog,
  type IDEConnectionConfig,
} from './IDEBridge.js'

export {
  IDEManager,
  ideManager,
  type IDEConnection,
  type IDEManagerConfig,
} from './IDEConnection.js'
