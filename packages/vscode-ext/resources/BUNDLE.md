# CCLocal Bundle Resources

This directory contains additional resources bundled with the extension.

## Structure

```
bundle/
├── cli/                  # CLI executables for all platforms
│   ├── cclocal-win32-x64.exe
│   ├── cclocal-darwin-x64
│   ├── cclocal-darwin-arm64
│   ├── cclocal-linux-x64
│   └── cclocal-linux-arm64
├── native/               # Native dependencies
│   ├── win32-x64/
│   │   └── rg.exe       # Ripgrep for Windows
│   ├── darwin-x64/
│   │   └── rg           # Ripgrep for macOS Intel
│   ├── darwin-arm64/
│   │   └── rg           # Ripgrep for macOS ARM
│   ├── linux-x64/
│   │   └── rg           # Ripgrep for Linux x64
│   ├── linux-arm64/
│   │   └── rg           # Ripgrep for Linux ARM
│   └── manifest.json    # Native dependency manifest
└── resources/            # Additional resources
    └── BUNDLE.md        # This file
```

## Usage

The extension automatically detects the appropriate platform and uses the correct binaries.

### CLI Detection

The extension uses the following priority for CLI location:
1. Custom path configured in `cclocal.cclocalPath`
2. Bundled CLI executable in `bundle/cli/`
3. System `cclocal` command in PATH

### Native Dependencies

Native dependencies like ripgrep are used for:
- Fast file searching
- Content searching within files
- Pattern matching operations

## Building

To build the complete bundle:

```bash
# From repository root
bun run package:all

# Or step by step:
bun run build:cli        # Build CLI executables
bun run download:native  # Download native dependencies
bun run package:ext      # Package extension
```

## Platform Support

| Platform | Architecture | CLI | Ripgrep |
|----------|-------------|-----|---------|
| Windows | x64 | ✅ | ✅ |
| macOS | x64 (Intel) | ✅ | ✅ |
| macOS | arm64 (M1/M2) | ✅ | ✅ |
| Linux | x64 | ✅ | ✅ |
| Linux | arm64 | ✅ | ✅ |
