"use strict";
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
exports.CclocalProcess = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
/**
 * 管理单次 cclocal --print 调用进程的生命周期。
 * cclocal 以 --print --output-format stream-json --verbose 方式启动，
 * 每次对话创建一个新进程，输出完毕后自动退出。
 */
class CclocalProcess {
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.process = null;
        this.buffer = '';
        this.killed = false;
    }
    /** 启动 cclocal 进程处理一次对话 */
    launch(options) {
        if (this.process) {
            this.kill();
        }
        this.buffer = '';
        this.killed = false;
        const { args, cmd } = this.buildCommand(options);
        this.process = (0, child_process_1.spawn)(cmd, args, {
            cwd: options.cwd,
            env: this.buildEnv(),
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
        });
        this.process.stdout?.on('data', (chunk) => {
            this.handleStdoutChunk(chunk.toString());
        });
        /** 收集 stderr 内容，进程退出时若无 stdout 输出则上报错误 */
        let stderrBuf = '';
        this.process.stderr?.on('data', (chunk) => {
            stderrBuf += chunk.toString();
        });
        this.process.on('error', (err) => {
            if (!this.killed) {
                this.callbacks.onError(`启动 cclocal 失败: ${err.message}`);
            }
        });
        this.process.on('close', (code) => {
            this.process = null;
            if (!this.killed) {
                if (code !== 0 && code !== null) {
                    // 优先展示 stderr 内容，帮助用户定位问题
                    const detail = stderrBuf.trim()
                        ? `\n详情: ${stderrBuf.trim().split('\n').slice(-3).join(' | ')}`
                        : '';
                    this.callbacks.onError(`cclocal 进程以退出码 ${code} 结束${detail}`);
                }
                this.callbacks.onExit();
            }
        });
    }
    /** 强制终止进程 */
    kill() {
        this.killed = true;
        if (this.process) {
            this.process.kill('SIGTERM');
            this.process = null;
        }
    }
    /** 判断进程是否仍在运行 */
    isRunning() {
        return this.process !== null && !this.killed;
    }
    /**
     * 构建注入了完整 PATH 的环境变量，确保子进程能找到 cclocal 和 bun。
     * VSCode Extension Host 不加载 shell 配置，默认 PATH 极简，
     * 需要手动补全 macOS 常见的可执行文件目录。
     */
    buildEnv() {
        const home = os.homedir();
        // 常见的 macOS 工具路径，按优先级排列
        const extraPaths = [
            '/opt/homebrew/bin', // Apple Silicon Homebrew
            '/usr/local/bin', // Intel Homebrew / 手动安装
            `${home}/.bun/bin`, // bun 默认安装路径
            `${home}/.local/bin`, // 用户级工具
            `${home}/.eigent/bin`, // eigent 自带 bun
            '/usr/bin',
            '/bin',
        ];
        const currentPath = process.env.PATH ?? '';
        // 将额外路径前置，避免被系统路径覆盖
        const mergedPath = [...extraPaths, currentPath].filter(Boolean).join(path.delimiter);
        return { ...process.env, PATH: mergedPath };
    }
    /**
     * 根据配置构建启动命令和参数。
     * 优先使用全局命令 cclocal，若提供了 projectPath 则用 bun run start。
     */
    buildCommand(options) {
        // 对提示词中的特殊字符进行转义，防止 shell: true 模式下解析异常
        const safePrompt = options.prompt;
        const baseArgs = [
            '--print',
            safePrompt,
            '--output-format',
            'stream-json',
            '--verbose',
        ];
        if (options.model) {
            baseArgs.push('--model', options.model);
        }
        if (options.projectPath && fs.existsSync(options.projectPath)) {
            // 使用 bun run start 方式启动，executablePath 为 bun 路径
            const bunBin = options.executablePath || 'bun';
            return {
                cmd: bunBin,
                args: ['run', 'start', '--', ...baseArgs],
            };
        }
        // 使用全局 cclocal 命令（绝对路径或命令名）
        return {
            cmd: options.executablePath || 'cclocal',
            args: baseArgs,
        };
    }
    /**
     * 处理 stdout 增量数据，按行分割并解析 JSON。
     * cclocal stream-json 模式每行输出一个 JSON 对象。
     */
    handleStdoutChunk(chunk) {
        this.buffer += chunk;
        const lines = this.buffer.split('\n');
        // 最后一段可能不完整，保留在 buffer 中
        this.buffer = lines.pop() ?? '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                continue;
            }
            try {
                const msg = JSON.parse(trimmed);
                this.callbacks.onMessage(msg);
            }
            catch {
                // 非 JSON 行（如调试输出）忽略
            }
        }
    }
}
exports.CclocalProcess = CclocalProcess;
//# sourceMappingURL=CclocalProcess.js.map