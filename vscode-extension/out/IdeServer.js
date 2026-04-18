"use strict";
/**
 * IdeServer — VSCode 扩展侧的 WebSocket 服务端实现。
 *
 * 工作原理（与官方 Claude Code 扩展 1:1 一致）：
 *  1. 扩展启动时在随机端口起一个 HTTP+WebSocket 服务器。
 *  2. 将连接信息写入 ~/.claude/ide/<port>.lock 文件（JSON 格式）。
 *  3. cclocal CLI 在启动时轮询 ~/.claude/ide/ 目录，发现 lock 文件后
 *     通过 WebSocket 连接到扩展，clientType 变为 "claude-vscode"。
 *  4. CLI 连接后，扩展通过 WebSocket 发送用户消息，接收 stream-json 格式的响应。
 *  5. 扩展停止时删除 lock 文件，关闭 WebSocket 服务器。
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdeServer = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const ws_1 = require("ws");
class IdeServer {
    constructor(workspaceFolders, callbacks) {
        this.server = null;
        this.wss = null;
        this.client = null;
        this.port = 0;
        this.lockfilePath = '';
        this.authToken = '';
        this.workspaceFolders = workspaceFolders;
        this.callbacks = callbacks;
    }
    /** 启动服务器：绑定随机端口，写 lock 文件 */
    async start() {
        /** 生成安全随机 token，用于 CLI 鉴权 */
        this.authToken = crypto.randomBytes(32).toString('hex');
        /** 创建 HTTP 服务器，仅用于 WebSocket 升级握手 */
        this.server = http.createServer((_req, res) => {
            res.writeHead(426, { 'Content-Type': 'text/plain' });
            res.end('Upgrade Required');
        });
        /** 创建 WebSocket 服务器，挂载到 HTTP 服务器 */
        this.wss = new ws_1.WebSocketServer({ server: this.server });
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
        this.wss.on('error', (err) => {
            this.callbacks.onError(err);
        });
        /** 绑定随机端口（传 0 让 OS 分配） */
        await new Promise((resolve, reject) => {
            this.server.listen(0, '127.0.0.1', () => {
                const addr = this.server.address();
                this.port = addr.port;
                resolve();
            });
            this.server.once('error', reject);
        });
        /** 写入 lock 文件，供 CLI 发现 */
        await this.writeLockfile();
    }
    /** 停止服务器，删除 lock 文件 */
    async stop() {
        this.deleteLockfile();
        if (this.client) {
            this.client.close();
            this.client = null;
        }
        await new Promise(resolve => {
            if (this.wss) {
                this.wss.close(() => resolve());
            }
            else {
                resolve();
            }
        });
        await new Promise(resolve => {
            if (this.server) {
                this.server.close(() => resolve());
            }
            else {
                resolve();
            }
        });
        this.wss = null;
        this.server = null;
    }
    /** 向已连接的 CLI 客户端发送消息 */
    send(message) {
        if (!this.client || this.client.readyState !== 1 /* OPEN */) {
            return false;
        }
        try {
            this.client.send(JSON.stringify(message) + '\n');
            return true;
        }
        catch {
            return false;
        }
    }
    /** 发送用户消息给 CLI（格式与 directConnectManager.ts 中一致） */
    sendUserMessage(text) {
        return this.send({
            type: 'user',
            message: {
                role: 'user',
                content: [{ type: 'text', text }],
            },
            parent_tool_use_id: null,
            session_id: '',
        });
    }
    /** 发送中断信号，取消当前请求 */
    sendInterrupt() {
        this.send({
            type: 'control_request',
            request_id: crypto.randomUUID(),
            request: { subtype: 'interrupt' },
        });
    }
    /** 判断是否有已连接的 CLI */
    isClientConnected() {
        return this.client !== null && this.client.readyState === 1;
    }
    /** 返回当前监听的端口 */
    getPort() {
        return this.port;
    }
    /** 返回 authToken（供日志/调试使用） */
    getAuthToken() {
        return this.authToken;
    }
    // ─── 私有方法 ────────────────────────────────────────────────────────────────
    /** 处理新的 WebSocket 连接（每次 CLI 启动都会连接一次） */
    handleConnection(ws, req) {
        /** 验证 Bearer token */
        const authHeader = req.headers['authorization'] ?? '';
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : '';
        if (token !== this.authToken) {
            ws.close(4003, 'Unauthorized');
            return;
        }
        /** 同时只允许一个 CLI 客户端 */
        if (this.client) {
            this.client.close(1001, 'Replaced by new connection');
        }
        this.client = ws;
        this.callbacks.onClientConnected();
        ws.on('message', (data) => {
            const raw = data.toString();
            /** CLI 每行一个 JSON，可能批量发送，按行拆分处理 */
            const lines = raw.split('\n').filter(l => l.trim());
            for (const line of lines) {
                this.callbacks.onMessage(line);
            }
        });
        ws.on('close', () => {
            if (this.client === ws) {
                this.client = null;
                this.callbacks.onClientDisconnected();
            }
        });
        ws.on('error', (err) => {
            this.callbacks.onError(err);
        });
    }
    /** 将连接信息写入 ~/.claude/ide/<port>.lock */
    async writeLockfile() {
        const ideDir = path.join(os.homedir(), '.claude', 'ide');
        /** 确保目录存在 */
        await fs.promises.mkdir(ideDir, { recursive: true });
        this.lockfilePath = path.join(ideDir, `${this.port}.lock`);
        const content = {
            workspaceFolders: this.workspaceFolders,
            pid: process.pid,
            ideName: 'VS Code',
            transport: 'ws',
            runningInWindows: false,
            authToken: this.authToken,
        };
        await fs.promises.writeFile(this.lockfilePath, JSON.stringify(content, null, 2), { encoding: 'utf-8', mode: 0o600 });
    }
    /** 删除 lock 文件（扩展停止或重启时清理） */
    deleteLockfile() {
        if (!this.lockfilePath) {
            return;
        }
        try {
            fs.unlinkSync(this.lockfilePath);
        }
        catch {
            // 文件可能已被手动删除，忽略
        }
        this.lockfilePath = '';
    }
}
exports.IdeServer = IdeServer;
//# sourceMappingURL=IdeServer.js.map