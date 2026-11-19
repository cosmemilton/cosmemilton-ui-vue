import assert from 'node:assert/strict'
import test from 'node:test'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { CmButton, CmGridContainer, CmLineChart, CmListPanel } from '../dist/index.js'

const render = view => renderToString(createSSRApp({ render: view }))

test('a lista usa filtros fluidos, descrição anunciável e ação de tabela', async () => {
  const html = await render(() => h(CmListPanel, { title: 'Fila de atendimento' }, {
    description: () => h('span', { 'aria-live': 'polite' }, '9 de 9 ordens'),
    filters: () => h('input', { type: 'search' }),
    default: () => h(CmButton, { presentation: 'tableAction' }, () => 'Editar'),
  }))
  assert.match(html, /cm-section-header__description"><span aria-live="polite">9 de 9 ordens/)
  assert.match(html, /aria-label="Fila de atendimento"[^>]*cm-grid-container--preset-filters cm-grid-container--auto/)
  assert.match(html, /--grid-min-column-width-base:12rem/)
  assert.match(html, /cm-button--table-action/)
  assert.doesNotMatch(html, /presentation=/)
})

test('a grade respeita a desativação do modo automático e o espaçamento padrão', async () => {
  const html = await render(() => h(CmGridContainer, { columns: 2, autoFit: false }))
  assert.doesNotMatch(html, /cm-grid-container--auto/)
  assert.match(html, /--grid-columns-base:2/)
  assert.match(html, /--grid-column-gap:1rem/)
})

test('os rótulos nas extremidades do gráfico ficam voltados para a área interna', async () => {
  const html = await render(() => h(CmLineChart, {
    data: [{ label: '19 de nov.', value: 100 }, { label: '10 de dez.', value: 10 }],
  }))
  assert.match(html, /<text[^>]*text-anchor="start"[^>]*>19 de nov\./)
  assert.match(html, /<text[^>]*text-anchor="end"[^>]*>10 de dez\./)
})
