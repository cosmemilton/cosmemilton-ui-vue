import { computed, defineComponent, h, onMounted, onUnmounted, ref, watch, type PropType, type VNodeChild } from 'vue'
import { CmButton, CmCheckbox } from './forms.js'
import { CmDialog } from './feedback.js'
import { CmPagination } from './extra.js'
import { CmEmpty, classes, element } from './primitives.js'

export type CmTableColumn = {
  key: string
  header: string
  sortable?: boolean
  hideable?: boolean
  defaultHidden?: boolean
  align?: 'left' | 'center' | 'right'
  footer?: VNodeChild
}

export type CmTableRow = { id: string | number; cells: Record<string, unknown> }

const sizes = [10, 20, 50]
const compareText = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })
const iconPaths = {
  settings: ['M10 5H3', 'M12 19H3', 'M14 3v4', 'M16 17v4', 'M21 12h-9', 'M21 19h-5', 'M21 5h-7', 'M8 10v4', 'M8 12H3'],
  ascending: ['M12 19V5', 'm5 12 7-7 7 7'],
  descending: ['M12 5v14', 'm19 12-7 7-7-7'],
  unsorted: ['m21 16-4 4-4-4', 'M17 20V4', 'm3 8 4-4 4 4', 'M7 4v16'],
}
function tableIcon(icon: keyof typeof iconPaths) {
  return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': true,
    class: icon === 'settings' ? 'cm-data-table__column-icon' : classes('cm-data-table__sort-icon', icon === 'unsorted' && 'cm-data-table__sort-icon--inactive'),
  }, iconPaths[icon].map(d => h('path', { d })))
}
function cellValue(cell: unknown): string | number {
  if (typeof cell === 'string' || typeof cell === 'number') return cell
  if (cell && typeof cell === 'object') {
    const details = cell as Record<string, unknown>
    const value = details.sortValue ?? details.text ?? details.formatted
    if (typeof value === 'string' || typeof value === 'number') return value
  }
  return ''
}

export const CmDataTable = defineComponent({
  name: 'CmDataTable',
  props: {
    columns: { type: Array as PropType<CmTableColumn[]>, required: true },
    rows: { type: Array as PropType<CmTableRow[]>, required: true },
    tableKey: String,
    label: String,
    title: String, description: String, defaultSortKey: String,
    defaultSortDirection: { type: String as PropType<'asc' | 'desc'>, default: 'asc' },
    emptyTitle: String,
    emptyDescription: String,
    pageSize: { type: Number, default: 10 },
    pageSizes: { type: Array as PropType<number[]>, default: () => sizes },
    pageResetKey: [String, Number],
    columnSettings: { type: Boolean, default: true },
    minWidth: Number,
    density: String,
    pagination: { type: Boolean, default: true },
    recordName: String,
  },
  setup(props, { slots }) {
    const page = ref(1)
    const pageSize = ref(props.pageSize)
    const scroll = ref<HTMLElement>()
    const table = ref<HTMLTableElement>()
    const hasOverflow = ref(false)
    let observer: ResizeObserver | undefined
    const sort = ref<{ key: string; direction: 'ascending' | 'descending' } | undefined>(props.defaultSortKey
      ? { key: props.defaultSortKey, direction: props.defaultSortDirection === 'desc' ? 'descending' : 'ascending' } : undefined)
    const columnsOpen = ref(false)
    const initialHidden = () => props.columns.filter(column => column.defaultHidden).map(column => column.key)
    const hidden = ref(initialHidden())
    const visible = computed(() => props.columns.filter(column => column.hideable === false || !hidden.value.includes(column.key)))
    const sorted = computed(() => {
      if (!sort.value) return props.rows
      const { key, direction } = sort.value
      return [...props.rows].sort((left, right) => {
        const a = cellValue(left.cells[key])
        const b = cellValue(right.cells[key])
        const compared = typeof a === 'number' && typeof b === 'number' ? a - b : compareText.compare(String(a), String(b))
        return direction === 'ascending' ? compared : -compared
      })
    })
    const maxPage = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize.value)))
    const pageRows = computed(() => props.pagination ? sorted.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value) : sorted.value)
    watch(() => props.rows, () => { page.value = Math.min(page.value, maxPage.value) })
    watch(pageSize, () => { page.value = 1 })
    function readHidden() {
      if (!props.tableKey) return
      try {
        const raw = localStorage.getItem('cm-vue-columns:' + props.tableKey)
        if (raw) {
          const value: unknown = JSON.parse(raw)
          if (Array.isArray(value)) hidden.value = value.filter(item => typeof item === 'string')
        }
      } catch {}
    }
    function measureOverflow() {
      hasOverflow.value = scroll.value ? scroll.value.scrollWidth > scroll.value.clientWidth + 1 : false
    }
    watch([scroll, table], ([viewport, content], [previousViewport, previousContent]) => {
      if (previousViewport) observer?.unobserve(previousViewport)
      if (previousContent) observer?.unobserve(previousContent)
      if (viewport) observer?.observe(viewport)
      if (content) observer?.observe(content)
      measureOverflow()
    }, { flush: 'post' })
    onMounted(() => {
      readHidden()
      if (typeof ResizeObserver === 'undefined') return
      observer = new ResizeObserver(measureOverflow)
      if (scroll.value) observer.observe(scroll.value)
      if (table.value) observer.observe(table.value)
      measureOverflow()
    })
    onUnmounted(() => observer?.disconnect())
    watch(() => props.pageResetKey, () => { page.value = 1 })
    function saveHidden(next: string[]) {
      hidden.value = next
      if (!props.tableKey) return
      try { localStorage.setItem('cm-vue-columns:' + props.tableKey, JSON.stringify(next)) } catch {}
    }
    function toggle(column: CmTableColumn) {
      if (!column.sortable) return
      sort.value = sort.value?.key === column.key && sort.value.direction === 'ascending'
        ? { key: column.key, direction: 'descending' }
        : { key: column.key, direction: 'ascending' }
      page.value = 1
    }
    const settings = () => element('button', {
      type: 'button', class: 'cm-data-table__column-button', 'aria-label': 'Configurar colunas',
      title: 'Configurar colunas', onClick: () => { columnsOpen.value = true },
    }, [tableIcon('settings'), hidden.value.length ? element('span', { class: 'cm-data-table__hidden-count' }, hidden.value.length) : null])
    const renderCell = (row: CmTableRow, column: CmTableColumn): VNodeChild =>
      slots.cell?.({ row, column, value: row.cells[column.key] }) ?? String(cellValue(row.cells[column.key]))
    const label = computed(() => props.label?.trim() || props.title || 'Tabela de dados')
    function heading() {
      return props.title || props.description ? element('div', { class: 'cm-data-table__top' },
        element('div', { class: 'cm-data-table__heading' }, [
          props.title ? element('h3', { class: 'cm-data-table__title' }, props.title) : null,
          props.description ? element('p', { class: 'cm-data-table__description' }, props.description) : null,
        ])) : null
    }
    function navigation() {
      const first = (page.value - 1) * pageSize.value + 1
      const end = Math.min(page.value * pageSize.value, sorted.value.length)
      const range = `${first}-${end} de ${sorted.value.length}${props.recordName ? ' ' + props.recordName : ''}`
      return element('div', { class: 'cm-data-table__foot cm-data-table__pagination-cell' },
        element('div', { class: 'cm-data-table__pagination' }, [
          element('div', { class: 'cm-data-table__pagination-group' }, [
            props.pageSizes.length > 1 ? [
              element('span', { class: 'cm-data-table__pagination-text' }, 'Linhas por página:'),
              element('select', { value: pageSize.value, 'aria-label': 'Linhas por página', class: 'cm-data-table__page-size',
                onChange: (event: Event) => { pageSize.value = Number((event.target as HTMLSelectElement).value) },
              }, props.pageSizes.map(size => element('option', { key: size, value: size }, String(size)))),
            ] : null,
            element('span', { class: 'cm-data-table__pagination-text' }, range),
          ]),
          h(CmPagination, { page: page.value, totalPages: maxPage.value, mode: 'compact', nextLabel: 'Próxima',
            'onUpdate:page': (next: number) => { page.value = next },
          }),
        ]))
    }
    function footer() {
      if (slots.totals) return element('tfoot', { class: 'cm-data-table__footer' }, slots.totals({ columns: visible.value }))
      if (!visible.value.some(column => column.footer != null)) return null
      return element('tfoot', { class: 'cm-data-table__footer' }, element('tr', {}, [
        props.columnSettings ? element('td', { class: 'cm-data-table__toggle-spacer' }) : null,
        ...visible.value.map(column => {
          const rowHeading = column.key === props.columns[0]?.key && column.footer != null
          return element(rowHeading ? 'th' : 'td', { key: column.key, scope: rowHeading ? 'row' : undefined,
            class: 'cm-data-table__cell cm-data-table__cell--' + (column.align ?? 'left'),
          }, column.footer)
        }),
      ]))
    }
    return () => [
      element('div', { class: classes('cm-data-table data-table-root cm-data-table--full-width', !pageRows.value.length && 'cm-data-table--empty',
        props.density && 'cm-density-' + props.density) }, !pageRows.value.length ? [
        heading(),
        element('div', { class: 'cm-data-table-empty' }, h(CmEmpty, {
          class: 'cm-data-table-empty__content', title: props.emptyTitle, description: props.emptyDescription,
        }, { icon: slots.emptyIcon, actions: slots.emptyActions })),
      ] : [
        heading(),
        element('div', { class: 'cm-data-table__viewport' }, element('div', {
          class: 'cm-data-table__scroll', ref: scroll, tabindex: hasOverflow.value ? 0 : undefined,
          role: hasOverflow.value ? 'region' : undefined, 'aria-label': hasOverflow.value ? label.value : undefined,
        }, [
          element('table', { class: 'cm-data-table__table', ref: table, 'aria-label': label.value,
            style: { minWidth: props.minWidth ? props.minWidth + 'px' : undefined } }, [
            element('thead', { class: 'cm-data-table__head' }, element('tr', {}, [
              props.columnSettings ? element('th', { scope: 'col', class: 'cm-data-table__toggle-cell' }, settings()) : null,
              ...visible.value.map(column => element('th', { key: column.key, scope: 'col',
                class: classes('cm-data-table__header', 'cm-data-table__cell--' + (column.align ?? 'left'),
                  column.sortable && 'cm-data-table__header--sortable'),
                'aria-sort': sort.value?.key === column.key ? sort.value.direction : undefined },
              column.sortable ? element('button', {
                type: 'button', class: 'cm-data-table__header-content' + (column.align ? ' cm-data-table__header-content--' + column.align : ''),
                onClick: () => toggle(column),
              }, [column.header, tableIcon(sort.value?.key === column.key ? sort.value.direction : 'unsorted')])
                : element('span', { class: 'cm-data-table__header-content' + (column.align ? ' cm-data-table__header-content--' + column.align : '') }, column.header))),
            ])),
            element('tbody', { class: 'cm-data-table__body' }, pageRows.value.map((row, index) =>
              element('tr', { key: row.id, class: classes('cm-data-table__row cm-data-table__row--hoverable', index % 2 && 'cm-data-table__row--zebra') }, [
                props.columnSettings ? element('td', { class: 'cm-data-table__toggle-spacer' }) : null,
                ...visible.value.map(column => element('td', {
                  key: column.key, class: 'cm-data-table__cell cm-data-table__cell--' + (column.align ?? 'left'),
                }, renderCell(row, column))),
              ]))),
            footer(),
          ]),
        ])),
        props.pagination ? navigation() : null,
      ]),
      h(CmDialog, { open: columnsOpen.value, title: 'Configurar colunas', onClose: () => { columnsOpen.value = false } }, {
        default: () => element('div', { class: 'cm-data-table__columns-grid' }, props.columns.map(column =>
          h(CmCheckbox, { key: column.key, label: column.header, class: 'cm-data-table__column-option',
            modelValue: !hidden.value.includes(column.key), disabled: column.hideable === false,
            'onUpdate:modelValue': (value: boolean) => saveHidden(value ? hidden.value.filter(key => key !== column.key) : [...hidden.value, column.key]),
          }))),
        footer: () => h(CmButton, { variant: 'outline', onClick: () => saveHidden(initialHidden()) }, { default: () => 'Restaurar padrão' }),
      }),
    ]
  },
})
