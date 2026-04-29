declare module "bun:ffi" {
  export function dlopen(path: string, symbols: Record<string, any>): any;
  export function CString(ptr: any): string;
  export const ptr: unique symbol;
  export type Pointer = number;
}
