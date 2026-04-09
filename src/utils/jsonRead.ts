/**
 * Leaf stripBOM — extracted from json.ts to break settings → json → log →
 * types/logs → … → settings. json.ts imports this for its memoized+logging
 * safeParseJSON; leaf callers that can't import json.ts use stripBOM +
 * jsonParse inline (syncCacheState does this).
 *
 * UTF-8 BOM (U+FEFF): PowerShell 5.x writes UTF-8 with BOM by default
 * (Out-File, Set-Content). We can't control user environments, so strip on
 * read. Without this, JSON.parse fails with "Unexpected token".
 */

const UTF8_BOM = '\uFEFF'

export function stripBOM(content: string): string {
  // 处理字符串开头的 BOM（readFileSync encoding:'utf-8' 会把 EF BB BF 转成 \uFEFF）
  if (content.startsWith(UTF8_BOM)) {
    return content.slice(1)
  }
  // 处理极少数情况：BOM 后跟换行（\uFEFF\r\n{...}），直接 trim 开头的不可见字符
  const trimmed = content.trimStart()
  if (trimmed.startsWith(UTF8_BOM)) {
    return trimmed.slice(1)
  }
  return content
}
