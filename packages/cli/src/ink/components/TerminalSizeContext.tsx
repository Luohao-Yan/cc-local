import { createContext } from 'react';
export type TerminalSize = {
  columns: number;
  rows: number;
};
// Use globalThis to ensure the same context instance is used across all module instantiations
// (bundle + source-loaded modules may instantiate this module twice)
const TERMINAL_SIZE_CONTEXT_KEY = Symbol.for('cclocal.TerminalSizeContext')

function getOrCreateTerminalSizeContext() {
  // @ts-expect-error: globalThis access for cross-module-instance sharing
  if (!globalThis[TERMINAL_SIZE_CONTEXT_KEY]) {
    // @ts-expect-error: globalThis access for cross-module-instance sharing
    globalThis[TERMINAL_SIZE_CONTEXT_KEY] = createContext<TerminalSize | null>(null)
  }
  // @ts-expect-error: globalThis access for cross-module-instance sharing
  return globalThis[TERMINAL_SIZE_CONTEXT_KEY]
}

export const TerminalSizeContext = getOrCreateTerminalSizeContext()
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJjcmVhdGVDb250ZXh0IiwiVGVybWluYWxTaXplIiwiY29sdW1ucyIsInJvd3MiLCJUZXJtaW5hbFNpemVDb250ZXh0Il0sInNvdXJjZXMiOlsiVGVybWluYWxTaXplQ29udGV4dC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlQ29udGV4dCB9IGZyb20gJ3JlYWN0J1xuXG5leHBvcnQgdHlwZSBUZXJtaW5hbFNpemUgPSB7XG4gIGNvbHVtbnM6IG51bWJlclxuICByb3dzOiBudW1iZXJcbn1cblxuZXhwb3J0IGNvbnN0IFRlcm1pbmFsU2l6ZUNvbnRleHQgPSBjcmVhdGVDb250ZXh0PFRlcm1pbmFsU2l6ZSB8IG51bGw+KG51bGwpXG4iXSwibWFwcGluZ3MiOiJBQUFBLFNBQVNBLGFBQWEsUUFBUSxPQUFPO0FBRXJDLE9BQU8sS0FBS0MsWUFBWSxHQUFHO0VBQ3pCQyxPQUFPLEVBQUUsTUFBTTtFQUNmQyxJQUFJLEVBQUUsTUFBTTtBQUNkLENBQUM7QUFFRCxPQUFPLE1BQU1DLG1CQUFtQixHQUFHSixhQUFhLENBQUNDLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMiLCJpZ25vcmVMaXN0IjpbXX0=