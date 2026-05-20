# 07 - Package Structure

## npm Package Layout

### Main Package: `@anthropic-ai/claude-code`

```
@anthropic-ai/claude-code/
├── bin/
│   └── claude.exe          # Native binary (placeholder stub, replaced by install.cjs)
├── cli-wrapper.cjs          # Node.js fallback launcher
├── install.cjs              # Post-install script (copies platform binary)
├── sdk-tools.d.ts           # TypeScript definitions for SDK tool schemas
├── package.json
├── README.md
└── LICENSE.md
```

### package.json

```json
{
  "name": "@anthropic-ai/claude-code",
  "version": "2.1.141",
  "bin": {
    "claude": "bin/claude.exe"
  },
  "scripts": {
    "postinstall": "node install.cjs",
    "prepare": "node -e \"if (!process.env.AUTHORIZED) { console.error('...'); process.exit(1); }\""
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "type": "module",
  "optionalDependencies": {
    "@anthropic-ai/claude-code-darwin-arm64": "2.1.141",
    "@anthropic-ai/claude-code-darwin-x64": "2.1.141",
    "@anthropic-ai/claude-code-linux-x64": "2.1.141",
    "@anthropic-ai/claude-code-linux-arm64": "2.1.141",
    "@anthropic-ai/claude-code-linux-x64-musl": "2.1.141",
    "@anthropic-ai/claude-code-linux-arm64-musl": "2.1.141",
    "@anthropic-ai/claude-code-win32-x64": "2.1.141",
    "@anthropic-ai/claude-code-win32-arm64": "2.1.141"
  },
  "files": [
    "bin/claude.exe",
    "install.cjs",
    "cli-wrapper.cjs",
    "sdk-tools.d.ts"
  ]
}
```

### Platform Package: `@anthropic-ai/claude-code-win32-x64`

```
@anthropic-ai/claude-code-win32-x64/
├── claude.exe              # Native Bun-compiled binary (~218 MB)
├── package.json
├── README.md
└── LICENSE.md
```

## Install Flow

```
npm install -g @anthropic-ai/claude-code
    │
    ├── 1. npm resolves optionalDependencies
    │      └── Downloads matching platform package (e.g. win32-x64)
    │
    ├── 2. npm creates bin shim
    │      └── Windows: claude.cmd → bin/claude.exe
    │
    ├── 3. postinstall: node install.cjs
    │      ├── Detect platform: process.platform + os.arch()
    │      ├── Detect musl (Linux): process.report.getReport()
    │      ├── Rosetta 2 detection (macOS): sysctl proc_translated
    │      ├── Resolve platform package: require.resolve(pkg + '/package.json')
    │      ├── Source binary: <pkg-dir>/claude.exe
    │      └── Place binary: hardlink > copyfile > restore stub on failure
    │
    └── 4. Result: bin/claude.exe = native binary for current platform
```

## Binary Structure

The `claude.exe` is a **PE32+ executable** (Windows) compiled by Bun's `bun build --compile`:

| Section | Content |
|---|---|
| PE Header | Standard Windows executable header |
| .text | Bun runtime (JavaScriptCore/WebKit) |
| Embedded JS | Transpiled application code (bytecode) |
| bun-vfs | Virtual filesystem with Node.js built-in shims |
| Bundle data | Application source, node_modules, assets |

### Bun VFS (Virtual File System)

The binary embeds a VFS containing Node.js built-in module shims:

```
/bun-vfs$$/node_modules/
├── os/          (index.js, package.json)
├── net/
├── sys/
├── tty/
├── url/
├── http/
├── path/
├── util/
├── zlib/
├── https/
├── assert/
├── buffer/
├── crypto/
├── domain/
├── events/
├── stream/
├── timers/
├── console/
├── process/
├── punycode/
├── constants/
├── querystring/
└── string_decoder/
```

Each module directory contains:
- `index.js` - Bun's built-in implementation
- `package.json` - Module metadata

## CLI Wrapper (`cli-wrapper.cjs`)

Fallback launcher for environments where postinstall didn't run (`--ignore-scripts`):

```javascript
// Key behavior:
// 1. Detect platform (same logic as install.cjs)
// 2. Resolve native binary from optionalDependencies
// 3. spawnSync(binaryPath, process.argv.slice(2), { stdio: 'inherit' })
// 4. Set CLAUDE_CODE_INSTALLED_VIA_NPM_WRAPPER=1 env var
// 5. Handle signal propagation (SIGPIPE → 128+signum)
```

## Platform Detection Logic

| Platform | Key | Binary Name |
|---|---|---|
| macOS ARM64 | `darwin-arm64` | `claude` |
| macOS x64 | `darwin-x64` | `claude` |
| macOS x64 (Rosetta) | `darwin-arm64` | `claude` (auto-detected) |
| Linux x64 (glibc) | `linux-x64` | `claude` |
| Linux ARM64 (glibc) | `linux-arm64` | `claude` |
| Linux x64 (musl) | `linux-x64-musl` | `claude` |
| Linux ARM64 (musl) | `linux-arm64-musl` | `claude` |
| Windows x64 | `win32-x64` | `claude.exe` |
| Windows ARM64 | `win32-arm64` | `claude.exe` |

### Musl Detection (Linux)

```javascript
function detectMusl() {
  if (process.platform !== 'linux') return false;
  const report = process.report?.getReport();
  return report?.header?.glibcVersionRuntime === undefined;
}
```

### Rosetta 2 Detection (macOS)

```javascript
if (platform === 'darwin' && cpu === 'x64') {
  const r = spawnSync('sysctl', ['-n', 'sysctl.proc_translated']);
  if (r.stdout?.trim() === '1') cpu = 'arm64';
}
```

## Binary Placement Strategy

```javascript
function placeBinary(src, dest) {
  // 1. Try hardlink (instant, zero extra disk)
  // 2. On EEXIST: read stub, unlink, retry link
  // 3. On link failure: try copyFileSync
  // 4. On copy failure: restore stub if available
  // 5. On EXDEV/EPERM: fall through to copyFileSync
  // 6. chmod 0o755 on non-Windows
}
```

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `CLAUDE_CODE_INSTALLED_VIA_NPM_WRAPPER` | Set by cli-wrapper.cjs when using Node fallback |
| `CLAUDE_CODE_SIMPLE` | Set by --bare flag, minimal mode |
| `AUTHORIZED` | Build-time check in prepare script |

## Comparison: npm Package vs Source Code

| Aspect | npm Package | Source Repository |
|---|---|---|
| Format | Compiled binary + wrapper scripts | TypeScript source files |
| Runtime | Bun native (no Node.js needed) | Requires Bun to develop/run |
| Size | ~218 MB per platform binary | ~multiple MB source + deps |
| Extensibility | None (closed binary) | Full customization |
| Debugging | Limited (string extraction only) | Full source + breakpoints |
| Distribution | npm registry | Git repository |
