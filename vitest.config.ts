import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // 使用 vitest 默认的 node 环境
    environment: 'node',
  },
  resolve: {
    alias: {
      // 将 bun:bundle 映射到本地 shim，避免 vitest 无法解析 bun 内置模块
      'bun:bundle': path.resolve(__dirname, 'src/_external/bun-bundle.ts'),
      // 映射 src/ 路径别名，与 tsconfig paths 保持一致
      src: path.resolve(__dirname, 'src'),
    },
  },
})
