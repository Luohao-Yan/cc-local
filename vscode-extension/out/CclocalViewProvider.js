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
exports.CclocalViewProvider = void 0;
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
const vscode = __importStar(require("vscode"));
const CclocalProcess_1 = require("./CclocalProcess");
/**
 * CCLocal 侧边栏 WebviewView 提供者。
 *
 * 通信方式：
 *  每次用户发消息 → spawn cclocal --print <prompt> --output-format stream-json --verbose
 *  解析 stdout 的 stream-json 行 → 推送到 Webview 流式渲染
 */
class CclocalViewProvider {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
        /** 当前正在构建的 AI 消息 ID */
        this.currentMessageId = '';
        /** 当前状态 */
        this.status = 'idle';
        this.cclocalProcess = new CclocalProcess_1.CclocalProcess({
            onMessage: (msg) => this.handleStreamMsg(msg),
            onError: (err) => {
                this.sendToWebview({ type: 'error', message: err });
                this.setStatus('error');
            },
            onExit: () => {
                if (this.currentMessageId) {
                    this.sendToWebview({ type: 'assistantDone', messageId: this.currentMessageId });
                    this.currentMessageId = '';
                }
                this.setStatus('idle');
            },
        });
    }
    /** VSCode 调用此方法创建/恢复 WebviewView */
    resolveWebviewView(webviewView, _context, _token) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };
        webviewView.webview.html = this.buildHtml(webviewView.webview);
        /** 监听来自 Webview 的消息 */
        webviewView.webview.onDidReceiveMessage((message) => {
            this.handleWebviewMessage(message);
        });
    }
    /**
     * 供 extension.ts 外部调用的命令分发接口。
     */
    handleCommand(command) {
        switch (command) {
            case 'newSession':
                this.newSession();
                break;
            case 'clearChat':
                this.clearChat();
                break;
            case 'stopGeneration':
                this.stopGeneration();
                break;
        }
    }
    /**
     * 供 extension.ts 外部直接发送消息（例如从编辑器右键菜单发送选中代码）。
     */
    sendMessage(text) {
        this.handleSendMessage(text);
    }
    // ─── 私有方法 ────────────────────────────────────────────────────────────────
    /** 处理来自 Webview 的消息 */
    handleWebviewMessage(message) {
        switch (message.type) {
            case 'ready':
                /** Webview 初始化完成，推送当前状态 */
                this.sendToWebview({ type: 'statusChange', status: this.status });
                break;
            case 'sendMessage':
                this.handleSendMessage(message.text);
                break;
            case 'stopGeneration':
                this.stopGeneration();
                break;
            case 'newSession':
                this.newSession();
                break;
            case 'clearChat':
                this.clearChat();
                break;
        }
    }
    /** 启动 cclocal 进程发送消息 */
    handleSendMessage(text) {
        if (this.status === 'running') {
            this.sendToWebview({ type: 'error', message: '正在处理上一条消息，请等待或点击停止' });
            return;
        }
        const config = vscode.workspace.getConfiguration('cclocal');
        const cclocalPath = config.get('cclocalPath') || 'cclocal';
        const model = config.get('model') || '';
        const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            ?? os.homedir();
        this.currentMessageId = this.generateId();
        /** 通知 Webview 显示用户消息 */
        this.sendToWebview({ type: 'userMessage', text, messageId: this.generateId() });
        this.setStatus('running');
        /** 启动 cclocal --print 进程 */
        this.cclocalProcess.launch({
            executablePath: cclocalPath,
            cwd,
            prompt: text,
            model: model || undefined,
        });
    }
    /** 处理 stream-json 行 */
    handleStreamMsg(msg) {
        switch (msg.type) {
            case 'assistant': {
                /** stream-json 格式里 assistant 消息带 content 数组 */
                const content = msg.message?.content ?? [];
                for (const block of content) {
                    if (block.type === 'text' && block.text) {
                        if (!this.currentMessageId)
                            this.currentMessageId = this.generateId();
                        this.sendToWebview({ type: 'assistantChunk', text: block.text, messageId: this.currentMessageId });
                    }
                    else if (block.type === 'tool_use') {
                        this.sendToWebview({ type: 'toolUse', name: block.name ?? 'tool', input: block.input, messageId: this.currentMessageId || this.generateId() });
                    }
                }
                break;
            }
            case 'content_block_delta':
                if (msg.delta?.type === 'text_delta' && msg.delta.text) {
                    if (!this.currentMessageId)
                        this.currentMessageId = this.generateId();
                    this.sendToWebview({ type: 'assistantChunk', text: msg.delta.text, messageId: this.currentMessageId });
                }
                break;
            case 'tool_use':
                this.sendToWebview({ type: 'toolUse', name: msg.name ?? 'tool', input: msg.input, messageId: this.currentMessageId || this.generateId() });
                break;
            case 'result':
                if (this.currentMessageId) {
                    this.sendToWebview({ type: 'assistantDone', messageId: this.currentMessageId });
                    this.currentMessageId = '';
                }
                this.setStatus('idle');
                break;
            case 'system':
                /** 系统消息（如 init），忽略 */
                break;
            default:
                break;
        }
    }
    /** 停止当前生成 */
    stopGeneration() {
        if (this.status === 'running') {
            this.cclocalProcess.kill();
            if (this.currentMessageId) {
                this.sendToWebview({ type: 'assistantDone', messageId: this.currentMessageId });
                this.currentMessageId = '';
            }
            this.setStatus('idle');
        }
    }
    /** 新建会话（清空 UI） */
    newSession() {
        this.stopGeneration();
        this.sendToWebview({ type: 'sessionCleared' });
    }
    /** 清空聊天记录 */
    clearChat() {
        this.stopGeneration();
        this.sendToWebview({ type: 'sessionCleared' });
    }
    /** 更新状态并通知 Webview */
    setStatus(status) {
        this.status = status;
        this.sendToWebview({ type: 'statusChange', status });
    }
    /** 从 Extension 侧向 Webview 发送消息 */
    sendToWebview(message) {
        this.view?.webview.postMessage(message);
    }
    /** 生成随机消息 ID */
    generateId() {
        return crypto.randomBytes(8).toString('hex');
    }
    /**
     * 构建侧边栏 Webview 的 HTML 内容。
     * 现代化设计：参考 Claude.ai 对话风格，全内联，离线可用。
     */
    buildHtml(webview) {
        const nonce = crypto.randomBytes(16).toString('base64');
        return /* html */ `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
  <title>CCLocal</title>
  <style nonce="${nonce}">
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:          var(--vscode-sideBar-background, #1a1a1a);
      --bg-elevated: var(--vscode-editorWidget-background, #232323);
      --bg-input:    var(--vscode-input-background, #2a2a2a);
      --fg:          var(--vscode-foreground, #e0e0e0);
      --fg-dim:      var(--vscode-descriptionForeground, #888);
      --fg-user:     #fff;
      --border:      var(--vscode-widget-border, #3a3a3a);
      --accent:      var(--vscode-button-background, #0078d4);
      --accent-fg:   var(--vscode-button-foreground, #fff);
      --danger:      var(--vscode-errorForeground, #f14c4c);
      --green:       #3fb950;
      --orange:      #e3a11d;
      --font:        var(--vscode-font-family, system-ui, sans-serif);
      --mono:        var(--vscode-editor-font-family, 'Cascadia Code', Consolas, monospace);
      --sz:          var(--vscode-font-size, 13px);
      --r:           8px;
    }

    html, body { height: 100%; background: var(--bg); color: var(--fg);
      font-family: var(--font); font-size: var(--sz); line-height: 1.65; }

    /* ── layout ── */
    #app { display: flex; flex-direction: column; height: 100vh; }

    /* ── messages ── */
    #thread {
      flex: 1; overflow-y: auto; padding: 16px 12px 8px;
      display: flex; flex-direction: column; gap: 0;
      scroll-behavior: smooth;
    }
    #thread::-webkit-scrollbar { width: 3px; }
    #thread::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

    /* ── empty state ── */
    #empty {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 12px; text-align: center; padding: 24px; color: var(--fg-dim);
      pointer-events: none;
    }
    #empty svg { opacity: .35; }
    #empty h3 { font-size: 15px; font-weight: 600; color: var(--fg); }
    #empty p  { font-size: 12px; line-height: 1.6; max-width: 220px; }

    /* ── message row ── */
    .row { display: flex; flex-direction: column; margin-bottom: 18px; }
    .row:last-child { margin-bottom: 4px; }

    /* user row — right-aligned bubble */
    .row.user { align-items: flex-end; }
    .row.user .bubble {
      background: var(--accent); color: var(--fg-user);
      border-radius: var(--r) var(--r) 2px var(--r);
      max-width: 88%; padding: 9px 13px;
      white-space: pre-wrap; word-break: break-word;
    }

    /* assistant row — full-width, no bubble bg */
    .row.assistant { align-items: flex-start; }
    .row.assistant .avatar {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 600; color: var(--fg-dim);
      margin-bottom: 4px; letter-spacing: .3px; text-transform: uppercase;
    }
    .row.assistant .avatar .dot {
      width: 18px; height: 18px; border-radius: 50%;
      background: linear-gradient(135deg, #7c5cfc, #4fa3e0);
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; color: #fff; font-weight: 700;
    }
    .row.assistant .content {
      padding-left: 24px; width: 100%;
      word-break: break-word; white-space: pre-wrap;
    }

    /* markdown inside assistant content */
    .content p  { margin: .3em 0; }
    .content strong { font-weight: 600; }
    .content em  { font-style: italic; }
    .content code {
      font-family: var(--mono); font-size: .85em;
      background: rgba(255,255,255,.07); border-radius: 4px;
      padding: 1px 5px;
    }
    .content pre {
      background: var(--bg-elevated); border: 1px solid var(--border);
      border-radius: var(--r); padding: 10px 12px; overflow-x: auto;
      margin: 6px 0;
    }
    .content pre code { background: none; padding: 0; font-size: .8em; }
    .content ul, .content ol { padding-left: 18px; margin: .3em 0; }
    .content li { margin: .15em 0; }
    .content blockquote {
      border-left: 3px solid var(--border); padding-left: 10px;
      color: var(--fg-dim); margin: .4em 0;
    }
    .content h1,.content h2,.content h3 {
      font-weight: 600; margin: .5em 0 .2em; line-height: 1.3;
    }
    .content h1 { font-size: 1.15em; }
    .content h2 { font-size: 1.05em; }
    .content h3 { font-size: .95em; }

    /* ── typing dots ── */
    .typing { display: flex; gap: 4px; align-items: center; padding: 2px 0 6px; }
    .typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--fg-dim); animation: blink 1.2s infinite;
    }
    .typing span:nth-child(2) { animation-delay: .2s; }
    .typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }

    /* ── tool card ── */
    .tool-row {
      display: flex; align-items: center; gap: 7px;
      padding: 5px 10px; margin: 3px 0 3px 24px;
      background: var(--bg-elevated); border: 1px solid var(--border);
      border-radius: 6px; font-size: 11px; color: var(--fg-dim);
      width: fit-content; max-width: 100%;
    }
    .tool-row .tool-icon { font-size: 12px; }
    .tool-row .tool-name { font-family: var(--mono); color: #c98aff; font-weight: 600; }

    /* ── error banner ── */
    .err-row {
      display: flex; align-items: flex-start; gap: 8px;
      background: rgba(241,76,76,.08); border: 1px solid rgba(241,76,76,.35);
      border-radius: var(--r); padding: 8px 12px; margin-bottom: 12px;
      font-size: 12px; color: var(--danger);
    }
    .err-row .err-icon { flex-shrink: 0; margin-top: 1px; }

    /* ── status strip ── */
    #status-strip {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 12px; font-size: 11px; color: var(--fg-dim);
      border-top: 1px solid var(--border); flex-shrink: 0;
      min-height: 24px;
    }
    #status-strip .pip {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--fg-dim); flex-shrink: 0; transition: background .3s;
    }
    #status-strip .pip.green  { background: var(--green); }
    #status-strip .pip.orange { background: var(--orange); animation: blink 1s infinite; }
    #status-strip .pip.red    { background: var(--danger); }
    #status-strip #status-label { flex: 1; }
    #status-strip #gen-spinner {
      display: none; width: 12px; height: 12px;
      border: 2px solid var(--border); border-top-color: var(--accent);
      border-radius: 50%; animation: spin .8s linear infinite;
    }
    #status-strip #gen-spinner.show { display: block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── input area ── */
    #composer {
      border-top: 1px solid var(--border); padding: 10px 10px 10px;
      background: var(--bg); flex-shrink: 0;
    }
    #composer-box {
      display: flex; align-items: flex-end; gap: 6px;
      background: var(--bg-input); border: 1px solid var(--border);
      border-radius: 10px; padding: 6px 6px 6px 12px;
      transition: border-color .2s;
    }
    #composer-box:focus-within { border-color: var(--accent); }

    #msg-input {
      flex: 1; background: transparent; border: none; outline: none;
      color: var(--fg); font-family: var(--font); font-size: var(--sz);
      resize: none; line-height: 1.55; min-height: 22px; max-height: 140px;
      padding: 2px 0;
    }
    #msg-input::placeholder { color: var(--fg-dim); }

    .composer-btn {
      border: none; border-radius: 7px; cursor: pointer;
      width: 30px; height: 30px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: opacity .15s, background .15s;
    }
    #send-btn { background: var(--accent); color: var(--fg-user); }
    #send-btn:hover:not(:disabled) { opacity: .85; }
    #send-btn:disabled { opacity: .35; cursor: not-allowed; }

    #stop-btn { background: var(--danger); color: #fff; display: none; }
    #stop-btn.show { display: flex; }
    #stop-btn:hover { opacity: .85; }

    #hint { font-size: 10px; color: var(--fg-dim); padding: 4px 2px 0; }
  </style>
</head>
<body>
<div id="app">

  <!-- message thread -->
  <div id="thread">
    <div id="empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <h3>CCLocal</h3>
      <p>Claude Code 本地助手<br/>正在连接，稍候即可发送消息</p>
    </div>
  </div>

  <!-- status strip -->
  <div id="status-strip">
    <div class="pip" id="pip"></div>
    <span id="status-label">正在启动…</span>
    <div id="gen-spinner"></div>
  </div>

  <!-- composer -->
  <div id="composer">
    <div id="composer-box">
      <textarea id="msg-input" rows="1"
        placeholder="发送消息… (Enter 发送，Shift+Enter 换行)"></textarea>
      <button id="stop-btn" class="composer-btn" title="停止生成">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="2" width="12" height="12" rx="2"/>
        </svg>
      </button>
      <button id="send-btn" class="composer-btn" title="发送">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
    <div id="hint">Enter 发送 &middot; Shift+Enter 换行</div>
  </div>
</div>

<script nonce="${nonce}">
const vscode = acquireVsCodeApi()

const threadEl  = document.getElementById('thread')
const emptyEl   = document.getElementById('empty')
const inputEl   = document.getElementById('msg-input')
const sendBtn   = document.getElementById('send-btn')
const stopBtn   = document.getElementById('stop-btn')
const pip       = document.getElementById('pip')
const statusLbl = document.getElementById('status-label')
const spinner   = document.getElementById('gen-spinner')

let isRunning = false
const bubbles = {}   // messageId → { el, text, done }

// ── markdown renderer ──────────────────────────────────────────────
function md(raw) {
  let s = raw
  // fenced code blocks
  s = s.replace(/\`\`\`([\\w.-]*)\\n?([\\s\\S]*?)\`\`\`/g, (_, lang, code) =>
    '<pre><code>' + esc(code.trim()) + '</code></pre>')
  // inline code
  s = s.replace(/\`([^\`\\n]+)\`/g, (_, c) => '<code>' + esc(c) + '</code>')
  // bold / italic
  s = s.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>')
  s = s.replace(/\\*\\*(.+?)\\*\\*/g,  '<strong>$1</strong>')
  s = s.replace(/\\*(.+?)\\*/g,   '<em>$1</em>')
  // headings
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  s = s.replace(/^## (.+)$/gm,  '<h2>$1</h2>')
  s = s.replace(/^# (.+)$/gm,   '<h1>$1</h1>')
  // blockquote
  s = s.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
  // unordered list
  s = s.replace(/^[*-] (.+)$/gm, '<li>$1</li>')
  s = s.replace(/(<li>.*<\\/li>)/s, '<ul>$1</ul>')
  // ordered list
  s = s.replace(/^\\d+\\. (.+)$/gm, '<li>$1</li>')
  // horizontal rule
  s = s.replace(/^---$/gm, '<hr/>')
  // paragraph breaks (double newline)
  s = s.replace(/\\n\\n/g, '</p><p>')
  // single newline
  s = s.replace(/\\n/g, '<br/>')
  return '<p>' + s + '</p>'
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;')
          .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ── dom helpers ────────────────────────────────────────────────────
function hideEmpty() { emptyEl.style.display = 'none' }

function addUserRow(text) {
  hideEmpty()
  const row = document.createElement('div')
  row.className = 'row user'
  const bubble = document.createElement('div')
  bubble.className = 'bubble'
  bubble.textContent = text
  row.appendChild(bubble)
  threadEl.appendChild(row)
  scrollEnd()
}

function ensureAssistantRow(id) {
  if (bubbles[id]) return bubbles[id]
  hideEmpty()
  const row = document.createElement('div')
  row.className = 'row assistant'
  row.id = 'r-' + id
  row.innerHTML =
    '<div class="avatar"><div class="dot">C</div>CCLocal</div>' +
    '<div class="content"><div class="typing"><span></span><span></span><span></span></div></div>'
  threadEl.appendChild(row)
  bubbles[id] = { el: row.querySelector('.content'), text: '', done: false }
  scrollEnd()
  return bubbles[id]
}

function appendChunk(id, chunk) {
  const entry = ensureAssistantRow(id)
  entry.text += chunk
  entry.el.innerHTML = md(entry.text)
  scrollEnd()
}

function finalizeRow(id) {
  const entry = bubbles[id]
  if (!entry || entry.done) return
  entry.done = true
  if (!entry.text) document.getElementById('r-' + id)?.remove()
}

function addToolRow(name) {
  hideEmpty()
  const div = document.createElement('div')
  div.className = 'tool-row'
  div.innerHTML = '<span class="tool-icon">⚙</span><span class="tool-name">' + esc(name) + '</span>'
  threadEl.appendChild(div)
  scrollEnd()
}

function addError(msg) {
  hideEmpty()
  const div = document.createElement('div')
  div.className = 'err-row'
  div.innerHTML = '<span class="err-icon">⚠</span><span>' + esc(msg) + '</span>'
  threadEl.appendChild(div)
  scrollEnd()
}

function scrollEnd() { threadEl.scrollTop = threadEl.scrollHeight }

// ── status strip ───────────────────────────────────────────────────
function setStatus(s) {
  isRunning = s === 'running'
  pip.className = 'pip'
  spinner.classList.remove('show')
  stopBtn.classList.remove('show')
  sendBtn.disabled = false

  if (s === 'running') {
    pip.classList.add('orange')
    statusLbl.textContent = '生成中…'
    spinner.classList.add('show')
    stopBtn.classList.add('show')
    sendBtn.disabled = true
  } else if (s === 'connected') {
    pip.classList.add('green')
    statusLbl.textContent = '已连接'
  } else if (s === 'connecting') {
    statusLbl.textContent = '正在连接…'
  } else if (s === 'error') {
    pip.classList.add('red')
    statusLbl.textContent = '出错了'
  } else {
    statusLbl.textContent = '就绪'
  }
}

// ── send ───────────────────────────────────────────────────────────
function send() {
  const text = inputEl.value.trim()
  if (!text || isRunning) return
  inputEl.value = ''
  resize()
  vscode.postMessage({ type: 'sendMessage', text })
}

// ── message bus ────────────────────────────────────────────────────
window.addEventListener('message', ({ data: m }) => {
  switch (m.type) {
    case 'userMessage':       addUserRow(m.text); break
    case 'assistantChunk':   appendChunk(m.messageId, m.text); break
    case 'assistantDone':    finalizeRow(m.messageId); break
    case 'toolUse':          addToolRow(m.name); break
    case 'permissionRequest': addToolRow('🔐 ' + m.toolName); break
    case 'error':            addError(m.message); setStatus('error'); break
    case 'statusChange':     setStatus(m.status); break
    case 'cliConnected':     setStatus('connected'); break
    case 'cliDisconnected':  setStatus('connecting'); break
    case 'sessionCleared':
      threadEl.innerHTML = ''
      threadEl.appendChild(emptyEl)
      emptyEl.style.display = ''
      Object.keys(bubbles).forEach(k => delete bubbles[k])
      setStatus('connected')
      break
  }
})

// ── input auto-resize ──────────────────────────────────────────────
function resize() {
  inputEl.style.height = 'auto'
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px'
}
inputEl.addEventListener('input', resize)
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
})
sendBtn.addEventListener('click', send)
stopBtn.addEventListener('click', () => vscode.postMessage({ type: 'stopGeneration' }))

// ── init ───────────────────────────────────────────────────────────
vscode.postMessage({ type: 'ready' })
inputEl.focus()
</script>
</body>
</html>`;
    }
}
exports.CclocalViewProvider = CclocalViewProvider;
CclocalViewProvider.viewType = 'cclocal.chatView';
//# sourceMappingURL=CclocalViewProvider.js.map