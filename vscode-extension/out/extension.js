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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const CclocalViewProvider_1 = require("./CclocalViewProvider");
/**
 * 扩展激活入口。
 * 注册侧边栏 Webview 和相关命令。
 * 每次用户发消息时，CclocalViewProvider 内部 spawn cclocal --print 进程处理对话。
 */
function activate(context) {
    /** 创建 Webview 提供者 */
    const provider = new CclocalViewProvider_1.CclocalViewProvider(context.extensionUri);
    /** 注册侧边栏 Webview */
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(CclocalViewProvider_1.CclocalViewProvider.viewType, provider, {
        /** 侧边栏隐藏后保留 Webview 状态，避免重新初始化 */
        webviewOptions: { retainContextWhenHidden: true },
    }));
    /** 注册命令：新建会话 */
    context.subscriptions.push(vscode.commands.registerCommand('cclocal.newSession', () => {
        void vscode.commands.executeCommand('cclocal.chatView.focus');
        provider.handleCommand('newSession');
    }));
    /** 注册命令：清空聊天记录 */
    context.subscriptions.push(vscode.commands.registerCommand('cclocal.clearChat', () => {
        provider.handleCommand('clearChat');
    }));
    /** 注册命令：停止生成 */
    context.subscriptions.push(vscode.commands.registerCommand('cclocal.stopGeneration', () => {
        provider.handleCommand('stopGeneration');
    }));
    /** 注册命令：发送编辑器中选中的代码 */
    context.subscriptions.push(vscode.commands.registerCommand('cclocal.sendSelectedCode', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('CCLocal: 没有活动的编辑器');
            return;
        }
        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showWarningMessage('CCLocal: 请先选中代码');
            return;
        }
        const selectedText = editor.document.getText(selection);
        const language = editor.document.languageId;
        const fileName = editor.document.fileName.split('/').pop() ?? '';
        const message = `请解释以下 ${language} 代码（来自 ${fileName}）：\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;
        void vscode.commands.executeCommand('cclocal.chatView.focus').then(() => {
            provider.sendMessage(message);
        });
    }));
}
/**
 * 扩展停用时调用。
 * CclocalViewProvider 内部的进程在 GC 时自动清理。
 */
function deactivate() {
    // 无需额外清理
}
//# sourceMappingURL=extension.js.map