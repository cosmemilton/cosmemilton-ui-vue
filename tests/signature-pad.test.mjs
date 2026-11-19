import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { chromium } from 'playwright'

test('a assinatura exporta PNG opaco, preserva o traço ao redimensionar e retorna ao estado vazio', async t => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
  t.after(() => browser.close())
  const page = await browser.newPage({ deviceScaleFactor: 2, hasTouch: true })
  await page.route('http://signature.test/**', async route => {
    const { pathname } = new URL(route.request().url())
    if (pathname === '/') {
      await route.fulfill({ contentType: 'text/html', body: '<link rel="stylesheet" href="/styles.css"><div id="app"></div><script type="importmap">{"imports":{"vue":"/vue.js"}}</script>' })
      return
    }
    const file = {
      '/vue.js': 'node_modules/vue/dist/vue.esm-browser.prod.js',
      '/signature-pad.js': 'dist/signature-pad.js',
      '/primitives.js': 'dist/primitives.js',
      '/styles.css': 'dist/styles.css',
    }[pathname]
    if (!file) { await route.abort(); return }
    await route.fulfill({ contentType: file.endsWith('.css') ? 'text/css' : 'application/javascript',
      body: await readFile(new URL('../' + file, import.meta.url)) })
  })
  await page.goto('http://signature.test/')
  await page.evaluate(async () => {
    const { createApp, h, ref } = await import('vue')
    const { CmSignaturePad } = await import('/signature-pad.js')
    const value = ref('inicial')
    const disabled = ref(false)
    window.setSignatureDisabled = next => { disabled.value = next }
    createApp({ setup: () => () => [
      h('div', { id: 'host', style: { width: '600px' } }, [h(CmSignaturePad, {
        'aria-label': 'Assinar comprovante', 'clear-label': 'Limpar assinatura', height: 144, disabled: disabled.value,
        onChange: image => { value.value = image },
      })]),
      h('output', { id: 'result' }, value.value ?? 'limpo'),
    ] }).mount('#app')
  })

  const canvas = page.locator('canvas')
  const clear = page.getByRole('button', { name: 'Limpar assinatura' })
  const output = page.locator('#result')
  const placeholder = page.getByText('Assine aqui')
  assert.equal(await clear.isDisabled(), true)
  assert.equal(await placeholder.isVisible(), true)
  assert.equal(await canvas.getAttribute('aria-label'), 'Assinar comprovante (vazia)')
  const first = await canvas.boundingBox()
  const centerY = first.y + first.height / 2
  await page.mouse.move(first.x + 20, centerY)
  await page.mouse.down()
  await page.mouse.move(first.x + first.width - 20, centerY, { steps: 8 })
  assert.equal(await output.textContent(), 'inicial')
  await page.mouse.up()
  assert.match(await output.textContent(), /^data:image\/png;base64,/)
  assert.equal(await clear.isEnabled(), true)
  assert.equal(await placeholder.isVisible(), false)

  await page.locator('#host').evaluate(host => { host.style.width = '380px' })
  await page.waitForFunction(() => document.querySelector('canvas').width < 900)
  const pixels = await canvas.evaluate(node => {
    const context = node.getContext('2d')
    return {
      ink: [...context.getImageData(node.width / 2, node.height / 2, 1, 1).data],
      background: [...context.getImageData(0, 0, 1, 1).data],
    }
  })
  assert.ok(pixels.ink[0] < 100)
  assert.deepEqual(pixels.background, [255, 255, 255, 255])
  await clear.click()
  assert.equal(await output.textContent(), 'limpo')
  assert.equal(await clear.isDisabled(), true)
  assert.equal(await placeholder.isVisible(), true)

  const second = await canvas.boundingBox()
  await page.mouse.move(second.x + 20, second.y + 40)
  await page.mouse.down()
  await page.mouse.move(second.x + 70, second.y + 60)
  await page.evaluate(() => window.setSignatureDisabled(true))
  await page.mouse.up()
  assert.equal(await output.textContent(), 'limpo')
  assert.equal(await placeholder.isVisible(), true)
  await page.evaluate(() => window.setSignatureDisabled(false))
  await page.touchscreen.tap(second.x + 40, second.y + 30)
  assert.match(await output.textContent(), /^data:image\/png;base64,/)
  assert.equal(await canvas.getAttribute('aria-label'), 'Assinar comprovante')
})
