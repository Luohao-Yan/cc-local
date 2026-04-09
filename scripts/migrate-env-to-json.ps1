# migrate-env-to-json.ps1
# 将 .env 配置迁移到 ~/.claude/models.json
# 用法: powershell -File scripts\migrate-env-to-json.ps1 -ProjectDir <项目目录> -OutFile <输出路径>
# 使用 PowerShell 执行，解决 bun 读取 GBK 编码 .env 文件乱码问题

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectDir,

    [Parameter(Mandatory=$true)]
    [string]$OutFile
)

$envPath = Join-Path $ProjectDir ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "MIGRATED=0"
    exit 0
}

# 解析 .env 文件：自动检测编码，跳过注释和空行
$vars = @{}
Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#')) {
        $idx = $line.IndexOf('=')
        if ($idx -gt 0) {
            $key = $line.Substring(0, $idx).Trim()
            $val = $line.Substring($idx + 1).Trim()
            $vars[$key] = $val
        }
    }
}

$apiKey       = $vars['ANTHROPIC_API_KEY']
$baseUrl      = $vars['ANTHROPIC_BASE_URL']
$model        = $vars['ANTHROPIC_MODEL']
$smallModel   = $vars['ANTHROPIC_SMALL_FAST_MODEL']
$disableChecks = $vars['DISABLE_INSTALLATION_CHECKS']

# 无有效 API Key 时跳过
if (-not $apiKey -or $apiKey -eq 'your-api-key-here') {
    Write-Host "MIGRATED=0"
    exit 0
}

# 根据 baseUrl 推断 Provider 名称
$providerName = 'default'
if ($baseUrl) {
    if     ($baseUrl -match 'volces\.com')   { $providerName = 'doubao' }
    elseif ($baseUrl -match 'openai\.com')   { $providerName = 'openai' }
    elseif ($baseUrl -match 'deepseek\.com') { $providerName = 'deepseek' }
    elseif ($baseUrl -match 'bigmodel\.cn')  { $providerName = 'glm' }
    elseif ($baseUrl -match 'minimax\.chat') { $providerName = 'minimax' }
    else {
        try {
            $h = ([uri]$baseUrl).Host.Split('.') | Where-Object { $_ -notin @('api','www','v1','v2') } | Select-Object -First 1
            if ($h -and $h.Length -gt 2) { $providerName = $h }
        } catch {}
    }
}

# 构建基础 Provider 的模型列表
$baseModels = @{}
if ($model) {
    $baseModels[$model] = @{ name = $model }
}

# 扫描 MODEL_*_NAME 多模型配置
$extraProviders = @{}
$multiCount = 0
foreach ($key in $vars.Keys) {
    if ($key -match '^MODEL_([A-Z0-9_]+)_NAME$') {
        $aliasUpper = $Matches[1]
        $aliasLower = $aliasUpper.ToLower()
        $mName = $vars[$key]
        $mUrl  = $vars["MODEL_${aliasUpper}_BASE_URL"]
        $mKey  = $vars["MODEL_${aliasUpper}_API_KEY"]

        if (-not $mName -or -not $mUrl) { continue }

        if ($mUrl -eq $baseUrl -and $mKey -eq $apiKey) {
            # 与基础 Provider 相同 → 追加模型到基础 Provider
            # 只有别名与模型名不同时才设置别名，避免冗余
            $entry = @{ name = $mName }
            if ($aliasLower -ne $mName.ToLower()) { $entry['alias'] = @($aliasLower) }
            $baseModels[$mName] = $entry
        } else {
            # 独立 Provider
            $entry = @{ name = $mName }
            if ($aliasLower -ne $mName.ToLower()) { $entry['alias'] = @($aliasLower) }
            $p = @{ name = $aliasLower; baseUrl = $mUrl; models = @{ $mName = $entry } }
            if ($mKey) { $p['apiKey'] = $mKey }
            $extraProviders[$aliasLower] = $p
        }
        $multiCount++
    }
}

# 组装最终配置
$providers = @{
    $providerName = @{
        name    = $providerName
        baseUrl = $baseUrl
        apiKey  = $apiKey
        models  = $baseModels
    }
}
foreach ($k in $extraProviders.Keys) { $providers[$k] = $extraProviders[$k] }

$cfg = @{ providers = $providers }
if ($model)      { $cfg['defaultModel']   = $model }
if ($smallModel) { $cfg['smallFastModel'] = $smallModel }
if ($disableChecks -eq '1' -or $disableChecks -eq 'true') {
    $cfg['settings'] = @{ disableInstallationChecks = $true }
}

# 确保输出目录存在
$outDir = Split-Path $OutFile -Parent
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

# 写入 UTF-8（无 BOM）JSON 文件
# 注意：System.Text.Encoding::UTF8 在 .NET 里默认带 BOM，必须用 UTF8NoBOM
$json = $cfg | ConvertTo-Json -Depth 10
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($OutFile, $json, $utf8NoBom)

Write-Host "MIGRATED=1 MULTI_COUNT=$multiCount"
