import * as assert from 'remix/assert'
import { after, before, describe, it } from 'remix/test'

import { makeTestApp, type TestApp } from '../../test/app.ts'

describe('root controller', () => {
  let app: TestApp

  before(async () => {
    app = await makeTestApp()
  })

  after(async () => {
    await app.close()
  })

  it('GET / returns the home page', async () => {
    const response = await app.get('/')

    assert.equal(response.status, 200)
    assert.match(response.headers.get('Content-Type') ?? '', /text\/html/)
    assert.match(await response.text(), /<html[\s>]/)
  })

  it('GET /health reports the database and its applied migrations', async () => {
    const response = await app.get('/health')
    const body = (await response.json()) as { ok: boolean; database: string; migrationsApplied: number }

    assert.equal(response.status, 200)
    assert.equal(body.ok, true)
    assert.equal(body.database, 'ok')
    assert.ok(body.migrationsApplied >= 1)
  })

  it('answers 404 with a page for an unknown address', async () => {
    const response = await app.get('/no-such-page')

    assert.equal(response.status, 404)
    assert.match(await response.text(), /Not found/)
  })

  it('never caches pages', async () => {
    const response = await app.get('/')

    assert.equal(response.headers.get('Cache-Control'), 'no-store')
  })
})
