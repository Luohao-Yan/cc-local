import type { MemoryHeader } from './memoryScan.js'

type MemoryScope = string

export function logMemoryWriteShape(
  _toolName: string,
  _toolInput: unknown,
  _filePath: string,
  _scope: MemoryScope,
): void {}

export function logMemoryRecallShape(
  _memories: MemoryHeader[],
  _selected: MemoryHeader[],
): void {}
