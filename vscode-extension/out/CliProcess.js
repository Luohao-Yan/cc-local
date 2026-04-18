"use strict";
/**
 * CliProcess — 管理 cclocal CLI 子进程的生命周期。
 *
 * 扩展启动时自动 spawn cclocal 进程（以 --ide 模式运行），
 * cclocal 发现 lock 文件后主动连接扩展的 WebSocket 服务器。
 *
 * 崩溃时自动重启（指数退避，最多 5 次）。
 * 扩展停用时优雅地终止进程。
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
exports.CliProcess = void 0;
const child_process_1 = require("child_process");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
/** 重启配置 */
const MAX_RESTARTS = 5;
const INITIAL_BACKOFF_MS = 1000;
class CliProcess {
    constructor(opts) {
        this.proc = null;
        this.restartCount = 0;
        this.backoffMs = INITIAL_BACKOFF_MS;
        this.stopped = false;
        this.restartTimer = null;
        this.cclocalPath = opts.cclocalPath;
        this.cwd = opts.cwd;
        this.callbacks = opts.callbacks;
    }
    /** 启动 cclocal 进程 */
    start() {
        this.stopped = false;
        this.restartCount = 0;
        this.backoffMs = INITIAL_BACKOFF_MS;
        this.spawn();
    }
    /** 优雅停止（不触发重启） */
    stop() {
        this.stopped = true;
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
        }
        if (this.proc) {
            this.proc.kill('SIGTERM');
            this.proc = null;
        }
    }
    /** 进程是否正在运行 */
    isRunning() {
        return this.proc !== null && !this.proc.killed;
    }
    // ─── 私有方法 ────────────────────────────────────────────────────────────────
    /** 创建子进程 */
    spawn() {
        const env = this.buildEnv();
        this.proc = (0, child_process_1.spawn)(this.cclocalPath, [], {
            cwd: this.cwd,
            env,
            stdio: ['ignore', 'pipe', 'pipe'],
            /** shell:true 确保 PATH 生效，支持别名和 shim */
            shell: true,
        });
        this.proc.stdout?.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(l => l.trim());
            for (const line of lines) {
                this.callbacks.onLog(`[stdout] ${line}`);
            }
        });
        this.proc.stderr?.on('data', (chunk) => {
            const lines = chunk.toString().split('\n').filter(l => l.trim());
            for (const line of lines) {
                this.callbacks.onLog(`[stderr] ${line}`);
            }
        });
        this.proc.on('exit', (code, signal) => {
            this.proc = null;
            if (this.stopped) {
                return;
            }
            this.callbacks.onLog(`[CliProcess] cclocal 进程退出 code=${code} signal=${signal}`);
            if (this.restartCount >= MAX_RESTARTS) {
                this.callbacks.onLog(`[CliProcess] 已达最大重启次数 (${MAX_RESTARTS})，停止重启`);
                this.callbacks.onUnexpectedExit(code);
                return;
            }
            this.restartCount++;
            this.callbacks.onLog(`[CliProcess] ${this.backoffMs}ms 后重启 (第 ${this.restartCount} 次)`);
            this.restartTimer = setTimeout(() => {
                this.restartTimer = null;
                if (!this.stopped) {
                    this.backoffMs = Math.min(this.backoffMs * 2, 30000);
                    this.spawn();
                }
            }, this.backoffMs);
        });
        this.proc.on('error', (err) => {
            this.callbacks.onLog(`[CliProcess] 启动失败: ${err.message}`);
        });
    }
    /**
     * 构建注入了完整 PATH 的环境变量。
     * VSCode Extension Host 的 PATH 很短，需要手动补全 macOS 常见工具路径。
     */
    buildEnv() {
        const home = os.homedir();
        const extraPaths = [
            '/opt/homebrew/bin', // Apple Silicon Homebrew
            '/usr/local/bin', // Intel Homebrew / 手动安装
            `${home}/.bun/bin`, // bun 默认安装
            `${home}/.local/bin`, // 用户级工具
            `${home}/.eigent/bin`, // eigent bun
            '/usr/bin',
            '/bin',
        ];
        const currentPath = process.env.PATH ?? '';
        const mergedPath = [...extraPaths, currentPath]
            .filter(Boolean)
            .join(path.delimiter);
        return { ...process.env, PATH: mergedPath };
    }
}
exports.CliProcess = CliProcess;
//# sourceMappingURL=CliProcess.js.map