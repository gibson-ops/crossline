/**
 * Rules every table must follow, checked against the real schema after migrations run.
 * These are the spec's day-one rules: they keep self-hosting, a managed version and
 * cross-organization work possible later.
 */
import * as assert from 'remix/assert'
import { after, before, describe, it } from 'remix/test'

import { startRuntime } from '../app/runtime.ts'
import { AppConfig } from '../services/config.ts'
import { MIGRATION_JOURNAL } from '../services/database.ts'
import { makeTestApp, makeTestDatabase, type TestApp } from './app.ts'

/** Tables that are exempt from the organization rule, with the reason. */
const NO_ORGANIZATION_COLUMN = new Set([
  // The organization itself.
  'organization',
  // The migration runner's own bookkeeping.
  MIGRATION_JOURNAL,
])

describe('schema rules', () => {
  let app: TestApp

  before(async () => {
    app = await makeTestApp()
  })

  after(async () => {
    await app.close()
  })

  it('every table carries a required organization_id', async () => {
    const tables = await app.database.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`,
    )
    const withOrganization = await app.database.query<{ table_name: string }>(
      `select table_name from information_schema.columns
       where table_schema = 'public' and column_name = 'organization_id' and is_nullable = 'NO'`,
    )
    const covered = new Set(withOrganization.map((row) => row.table_name))

    const missing = tables
      .map((row) => row.table_name)
      .filter((name) => !NO_ORGANIZATION_COLUMN.has(name) && !covered.has(name))

    assert.deepEqual(missing, [])
  })

  it('every primary key is a uuid', async () => {
    const keys = await app.database.query<{ table_name: string; data_type: string }>(
      `select c.table_name, c.data_type
       from information_schema.table_constraints k
       join information_schema.key_column_usage u
         on u.constraint_name = k.constraint_name and u.table_schema = k.table_schema
       join information_schema.columns c
         on c.table_schema = u.table_schema and c.table_name = u.table_name and c.column_name = u.column_name
       where k.table_schema = 'public' and k.constraint_type = 'PRIMARY KEY'`,
    )

    const notUuid = keys
      .filter((row) => row.table_name !== MIGRATION_JOURNAL && row.data_type !== 'uuid')
      .map((row) => row.table_name)

    assert.deepEqual(notUuid, [])
  })
})

describe('migrations', () => {
  it('apply to an empty database and are a no-op the second time', async () => {
    const database = await makeTestDatabase()
    try {
      // First start: creates the journal and applies everything.
      const first = await startRuntime(AppConfig.layerFor({ databaseUrl: database.url }))
      await first.dispose()
      const afterFirst = await database.query<{ applied: number }>(
        `select count(*)::int as applied from ${MIGRATION_JOURNAL}`,
      )

      // Second start: finds nothing pending.
      const second = await startRuntime(AppConfig.layerFor({ databaseUrl: database.url }))
      await second.dispose()
      const afterSecond = await database.query<{ applied: number }>(
        `select count(*)::int as applied from ${MIGRATION_JOURNAL}`,
      )

      assert.ok(afterFirst[0].applied >= 1)
      assert.equal(afterSecond[0].applied, afterFirst[0].applied)
    } finally {
      await database.drop()
    }
  })

  it('stop startup when the database cannot be reached', async () => {
    await assert.rejects(() =>
      startRuntime(AppConfig.layerFor({ databaseUrl: 'postgres://nobody:wrong@127.0.0.1:1/none' })),
    )
  })
})
