import BetterSqlite3 from '../../../../packages/core/node_modules/better-sqlite3'

type StatementArgs = unknown[]

function normalizeNamedParams(value: unknown): unknown {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return value
  }

  const normalized: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    normalized[key.startsWith('$') ? key.slice(1) : key] = entry
  }
  return normalized
}

function normalizeArgs(args: StatementArgs): StatementArgs {
  if (args.length === 1) {
    return [normalizeNamedParams(args[0])]
  }
  return args
}

class StatementWrapper {
  constructor(private readonly statement: any) {}

  run(...args: StatementArgs): unknown {
    return this.statement.run(...normalizeArgs(args))
  }

  get(...args: StatementArgs): unknown {
    return this.statement.get(...normalizeArgs(args))
  }

  all(...args: StatementArgs): unknown {
    return this.statement.all(...normalizeArgs(args))
  }
}

export class Database {
  private readonly db: any

  constructor(filename?: string, options?: Record<string, unknown>) {
    const DatabaseCtor = BetterSqlite3 as unknown as new (path?: string, options?: Record<string, unknown>) => any
    this.db = new DatabaseCtor(filename, options)
  }

  exec(sql: string): void {
    this.db.exec(sql)
  }

  prepare(sql: string): StatementWrapper {
    return new StatementWrapper(this.db.prepare(sql))
  }

  transaction<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => TResult): (...args: TArgs) => TResult {
    return this.db.transaction(fn)
  }

  close(): void {
    this.db.close()
  }
}
