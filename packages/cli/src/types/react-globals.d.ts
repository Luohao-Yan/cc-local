// Make React namespace available globally so `React.ReactNode` etc. work in .ts files.
// In .tsx files, jsx: "react-jsx" auto-imports React, but .ts files don't get this benefit.
// This file has no imports/exports so it's treated as a script (ambient) by TypeScript.
declare namespace React {
  type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[]
  type ReactElement<P = any> = { type: any; props: P; key: string | null }
  type ComponentType<P = any> = (props: P) => ReactElement | null
  type FC<P = {}> = (props: P) => ReactElement | null
  type PropsWithChildren<P = {}> = P & { children?: ReactNode }
  type Ref<T = any> = ((instance: T | null) => void) | { current: T | null } | null
  type RefObject<T = any> = { current: T | null }
  function createElement(type: any, props?: any, ...children: any[]): any
  function useContext<T>(context: any): T
}
