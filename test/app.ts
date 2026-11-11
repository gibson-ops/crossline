/**
 * The test harness: the whole app over a throwaway Postgres database.
 * Each test app gets its own database, created empty and dropped on close, so tests never
 * share state and never touch the development database.
 */
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'

import pg from 'pg'

import { createAppRouter } from '../app/router.tsx'
import { startRuntime } from '../app/runtime.ts'
import { AppConfig } from '../services/config.ts'

// `pg` is a CommonJS package, so its classes come off the default export (a named import is not reliable).
// oxlint-disable-next-line import/no-named-as-default-member
const { Client } = pg

export const ORIGIN = 'http://localhost'

// Local runs read TEST_DATABASE_URL from .env; CI sets it in the environment.
if (!process.env.TEST_DATABASE_URL && existsSync('.env')) process.loadEnvFile('.env')

export interface TestDatabase {
  /** Connection string for the throwaway database. */
  readonly url: string
  /** Runs one SQL statement against the throwaway database and returns its rows. */
  query<Row extends pg.QueryResultRow>(text: string): Promise<Row[]>
  /** Drops the database. Call after everything using it has closed. */
  drop(): Promise<void>
}

/**
 * Creates an empty database on the test server.
 * @throws when TEST_DATABASE_URL is not set
 */
export async function makeTestDatabase(): Promise<TestDatabase> {
  const adminUrl = process.env.TEST_DATABASE_URL
  if (!adminUrl) {
    throw new Error('TEST_DATABASE_URL is not set. Copy .env.example to .env and run `npm run db:up`.')
  }

  // Step 1: create the database from a connection to the server's maintenance database.
  const name = `crossline_test_${randomBytes(6).toString('hex')}`
  const admin = new Client({ connectionString: adminUrl })
  await admin.connect()
  await admin.query(`create database ${name}`)
  await admin.end()

  // Step 2: point a connection string at it.
  const target = new URL(adminUrl)
  target.pathname = `/${name}`
  const url = target.toString()

  return {
    url,
    async query(text) {
      const client = new Client({ connectionString: url })
      await client.connect()
      try {
        const result = await client.query(text)
        return result.rows
      } finally {
        await client.end()
      }
    },
    async drop() {
      const closer = new Client({ connectionString: adminUrl })
      await closer.connect()
      await closer.query(`drop database if exists ${name} with (force)`)
      await closer.end()
    },
  }
}

export interface TestApp {
  readonly database: TestDatabase
  get(path: string, headers?: Record<string, string>): Promise<Response>
  /** A same-origin form POST (cross-origin protection rejects others). */
  post(path: string, fields: Record<string, string>, headers?: Record<string, string>): Promise<Response>
  /** Disposes the runtime and drops the database. */
  close(): Promise<void>
}

/** The whole app, migrated, over a new empty database. Call `close()` when done. */
export async function makeTestApp(): Promise<TestApp> {
  const database = await makeTestDatabase()
  const runtime = await startRuntime(AppConfig.layerFor({ databaseUrl: database.url, publicUrl: ORIGIN }))
  const router = createAppRouter(runtime)
  return {
    database,
    get: (path, headers = {}) => router.fetch(new Request(new URL(path, ORIGIN), { headers })),
    post(path, fields, headers = {}) {
      const body = new FormData()
      for (const [key, value] of Object.entries(fields)) body.set(key, value)
      return router.fetch(
        new Request(new URL(path, ORIGIN), { method: 'POST', body, headers: { Origin: ORIGIN, ...headers } }),
      )
    },
    async close() {
      await runtime.dispose()
      await database.drop()
    },
  }
}
