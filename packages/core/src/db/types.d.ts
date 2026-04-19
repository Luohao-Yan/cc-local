/**
 * better-sqlite3 类型声明
 */

declare module 'better-sqlite3' {
  class Database {
    constructor(path: string, options?: { readonly?: boolean; fileMustExist?: boolean })
    
    prepare(sql: string): Statement
    exec(sql: string): void
    close(): void
    
    readonly: boolean
    name: string
    open: boolean
    inTransaction: boolean
    
    pragma(source: string, options?: { simple?: boolean }): unknown
    backup(destination: string | Database): Promise<unknown>
    serialize(options?: { attached?: string }): Buffer
    function(name: string, cb: (...args: unknown[]) => unknown): void
    aggregate(name: string, options: { start?: unknown; step: (...args: unknown[]) => unknown; result?: () => unknown }): void
    loadExtension(path: string, entryPoint?: string): void
  }

  class Statement {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number }
    get(...params: unknown[]): unknown | undefined
    all(...params: unknown[]): unknown[]
    iterate(...params: unknown[]): IterableIterator<unknown>
    pluck(toggle?: boolean): this
    expand(toggle?: boolean): this
    raw(toggle?: boolean): this
    bind(...params: unknown[]): this
    columns(): Array<{ name: string; type: string | null }>
    safeIntegers(toggle?: boolean): this
  }

  export = Database
}
