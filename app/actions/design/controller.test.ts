import * as assert from 'remix/assert'
import { after, before, describe, it } from 'remix/test'

import { makeTestApp, type TestApp } from '../../../test/app.ts'

describe('design pages', () => {
  let app: TestApp

  before(async () => {
    app = await makeTestApp()
  })

  after(async () => {
    await app.close()
  })

  it('render the gallery and the three mockups', async () => {
    for (const path of ['/design', '/design/my-list', '/design/call-review', '/design/email']) {
      const response = await app.get(path)
      assert.equal(response.status, 200, path)
      assert.match(await response.text(), /<html[\s>]/, path)
    }
  })

  it('follow the device unless a known theme is forced', async () => {
    const followsDevice = await (await app.get('/design/my-list')).text()
    const forcedDark = await (await app.get('/design/my-list?theme=dark')).text()
    const unknown = await (await app.get('/design/my-list?theme=not-a-theme')).text()

    assert.doesNotMatch(followsDevice, /data-theme=/)
    assert.match(forcedDark, /<html[^>]*data-theme="dark"/)
    assert.doesNotMatch(unknown, /data-theme=/)
  })

  it('open the detail of the to-do named in the address, and only then', async () => {
    const closed = await (await app.get('/design/my-list')).text()
    const open = await (await app.get('/design/my-list?open=t1')).text()
    const missing = await (await app.get('/design/my-list?open=no-such-todo')).text()

    assert.doesNotMatch(closed, /id="detail-title"/)
    assert.match(open, /id="detail-title"/)
    assert.match(open, /Where this came from/)
    assert.doesNotMatch(missing, /id="detail-title"/)
  })

  it('show the stretch named in the address on call review', async () => {
    const first = await (await app.get('/design/call-review?stretch=s1')).text()
    const second = await (await app.get('/design/call-review?stretch=s2')).text()

    assert.match(first, /Who offered to confirm the demo time\?/)
    assert.match(second, /Who is sending the pilot summary\?/)
  })

  it('render the morning email as standalone HTML with absolute links', async () => {
    const response = await app.get('/design/email/raw')
    const html = await response.text()

    assert.equal(response.status, 200)
    assert.match(response.headers.get('Content-Type') ?? '', /text\/html/)
    assert.match(html, /Do now/)
    assert.match(html, /Send Dana the revised quote/)
    assert.match(html, /href="http:\/\/localhost\/design\/my-list/)
    // Email clients cannot read CSS variables or oklch(), so neither may reach the email.
    assert.doesNotMatch(html, /var\(--|oklch\(/)
  })
})
