/**
 * The Postgres connection, opened once per runtime and closed when the runtime is disposed.
 * Building this service applies every pending migration, so the app never serves a request
 * against an out-of-date schema.
 */
import { fileURLToPath } from 'node:url'

import { Context, Effect, Layer, Redacted } from 'effect'
import { sql } from 'remix/data-table'
import { loadMigrations } from 'remix/data-table/migrations/node'
import { createPostgresDatabase } from 'remix/data-table/postgres'

import { storeError, type StoreError } from '../domain/errors.ts'
import { AppConfig } from './config.ts'

/** The migration runner's journal table (its default name). */
export const MIGRATION_JOURNAL = 'data_table_migrations'

const MIGRATIONS_DIR = fileURLToPath(new URL('../db/migrations/', import.meta.url))

type PostgresDatabase = ReturnType<typeof createPostgresDatabase>

export interface DatabaseHealth {
  /** How many migrations the journal records as applied. */
  readonly migrationsApplied: number
}

export class Database extends Context.Service<
  Database,
  {
    /** The query interface (`remix/data-table`). Stores wrap its calls in `Effect.tryPromise`. */
    readonly db: PostgresDatabase
    /** Proves the database answers and reports the schema's state, for `/health`. */
    readonly health: Effect.Effect<DatabaseHealth, StoreError>
  }
>()('crossline/services/Database') {
  static readonly layer = Layer.effect(
    Database,
    Effect.gen(function* () {
      const config = yield* AppConfig

      // Step 1: open the pool; the release closes it when the runtime is disposed.
      const db = yield* Effect.acquireRelease(
        Effect.sync(() => createPostgresDatabase({ connectionString: Redacted.value(config.databaseUrl) })),
        (open) => Effect.promise(() => open.close()),
      )

      // Step 2: apply pending migrations. The runner takes a Postgres advisory lock, records
      // each migration in its journal, and refuses to run if an applied file has changed.
      yield* Effect.tryPromise({
        try: async () => db.migrate(await loadMigrations(MIGRATIONS_DIR)),
        catch: storeError,
      })

      const health = Effect.tryPromise({
        try: async () => {
          const result = await db.exec(sql`select count(*)::int as applied from data_table_migrations`)
          const row = result.rows?.[0] as { applied: number } | undefined
          return { migrationsApplied: row?.applied ?? 0 }
        },
        catch: storeError,
      })

      return Database.of({ db, health })
    }),
  )
}
