/**
 * 服务端管理器
 * 管理 CCLocal Server 的生命周期
 */

import * as vscode from 'vscode'
import { spawn, type ChildProcess } from 'child_process'
import * as path from 'path'

export class ServerManager {
  private serverProcess?: ChildProcess
  private serverPort = 5678
  private serverUrl = 'ws://127.0.0.1:5678'

  getServerUrl(): string {
    return this.serverUrl
  }

  async ensureServerRunning(): Promise<void> {
    // 检查服务端是否已在运行
    const isRunning = await this.checkServerHealth()
    if (isRunning) {
      console.log('CCLocal server already running')
      return
    }

    // 启动嵌入式服务端
    await this.startEmbeddedServer()
  }

  private async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`http://127.0.0.1:${this.serverPort}/health`)
      return response.ok
    } catch {
      return false
    }
  }

  private async startEmbeddedServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 查找服务端入口
      const serverPath = this.findServerPath()
      if (!serverPath) {
        reject(new Error('CCLocal server not found'))
        return
      }

      console.log(`Starting CCLocal server from: ${serverPath}`)

      this.serverProcess = spawn('bun', [serverPath], {
        env: {
          ...process.env,
          CCLOCAL_PORT: String(this.serverPort),
          CCLOCAL_HOST: '127.0.0.1',
        },
        detached: false,
      })

      this.serverProcess.stdout?.on('data', (data) => {
        console.log(`[CCLocal Server] ${data.toString().trim()}`)
      })

      this.serverProcess.stderr?.on('data', (data) => {
        console.error(`[CCLocal Server] ${data.toString().trim()}`)
      })

      // 等待服务端启动
      setTimeout(async () => {
        const isRunning = await this.checkServerHealth()
        if (isRunning) {
          resolve()
        } else {
          reject(new Error('Server failed to start'))
        }
      }, 3000)
    })
  }

  private findServerPath(): string | undefined {
    // 可能的相对路径
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'server', 'dist', 'index.js'),
      path.join(__dirname, '..', '..', '..', 'packages', 'server', 'dist', 'index.js'),
    ]

    for (const p of possiblePaths) {
      try {
        const fs = require('fs')
        if (fs.existsSync(p)) {
          return p
        }
      } catch {
        // 忽略错误
      }
    }

    return undefined
  }

  stopServer(): void {
    if (this.serverProcess) {
      this.serverProcess.kill()
      this.serverProcess = undefined
    }
  }
}
