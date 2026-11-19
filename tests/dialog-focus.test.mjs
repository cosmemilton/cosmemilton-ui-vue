import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { chromium } from 'playwright'

test('o diálogo mantém o foco dentro dele e Escape devolve o foco ao botão de abertura', async t => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
  t.after(() => browser.close())
  const page = await browser.newPage()
  await page.route('http://dialog.test/**', async route => {
    const { pathname } = new URL(route.request().url())
    if (pathname === '/') {
      await route.fulfill({ contentType: 'text/html', body: '<div id="app"></div><script type="importmap">{"imports":{"vue":"/vue.js"}}</script>' })
      return
    }
    const file = { '/vue.js': 'node_modules/vue/dist/vue.esm-browser.prod.js', '/feedback.js': 'dist/feedback.js', '/primitives.js': 'dist/primitives.js' }[pathname]
    if (!file) { await route.abort(); return }
    await route.fulfill({ contentType: 'application/javascript', body: await readFile(new URL('../' + file, import.meta.url)) })
  })
  await page.goto('http://dialog.test/')
  await page.evaluate(async () => {
    const { createApp, h, ref } = await import('vue')
    const { CmDialog } = await import('/feedback.js')
    const open = ref(false)
    createApp({ setup: () => () => [
      h('button', { id: 'trigger', onClick: () => { open.value = true } }, 'Configurar colunas'),
      h(CmDialog, { open: open.value, title: 'Colunas', onClose: () => { open.value = false } }, { default: () => [
        h('input', { disabled: true }), h('input', { hidden: true }), h('input', { id: 'cliente', type: 'checkbox' }),
      ] }),
    ] }).mount('#app')
  })
  const trigger = page.getByRole('button', { name: 'Configurar colunas' })
  const dialog = page.getByRole('dialog', { name: 'Colunas' })
  await trigger.click()
  assert.equal(await page.evaluate(() => document.activeElement.id), 'cliente')
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(() => document.activeElement.id), 'trigger')

  await page.addStyleTag({ content: '[role="dialog"] input,[role="dialog"] button{display:none}' })
  await trigger.click()
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'dialog')
  await page.keyboard.press('Tab')
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('role')), 'dialog')
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'detached' })
  assert.equal(await page.evaluate(() => document.activeElement.id), 'trigger')
})
