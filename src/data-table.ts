import { computed, defineComponent, h, onMounted, ref, watch, type PropType, type VNodeChild } from 'vue'
import { CmButton, CmCheckbox, CmNativeSelect } from './forms.js'
import { CmDialog } from './feedback.js'
import { CmEmpty, classes, element } from './primitives.js'

export type CmTableColumn = {
  key: string
  header: string
  sortable?: boolean
  hideable?: boolean
  defaultHidden?: boolean
  align?: 'left' | 'center' | 'right'
}

export type CmTableRow = { id: string | number; cells: Record<string, unknown> }

const sizes = [10, 20, 50]
const compareText = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })
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
    emptyTitle: String,
    emptyDescription: String,
    pageSize: { type: Number, default: 10 },
    pageSizes: { type: Array as PropType<number[]>, default: () => sizes },
    columnSettings: { type: Boolean, default: true },
    minWidth: Number,
    density: String,
    pagination: { type: Boolean, default: true },
    recordName: { type: String, default: 'registros' },
  },
  setup(props, { slots }) {
    const page = ref(1)
    const pageSize = ref(props.pageSize)
    const sort = ref<{ key: string; direction: 'ascending' | 'descending' }>()
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
    onMounted(readHidden)
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
    const settings = () => h(CmButton, {
      variant: 'ghost', size: 'sm', class: 'cm-data-table__column-button', 'aria-label': 'Configurar colunas',
      title: 'Configurar colunas', onClick: () => { columnsOpen.value = true },
    }, { default: () => '☷' })
    const renderCell = (row: CmTableRow, column: CmTableColumn): VNodeChild =>
      slots.cell?.({ row, column, value: row.cells[column.key] }) ?? String(cellValue(row.cells[column.key]))
    const navigation = () => element('div', { class: 'cm-data-table__pagination', 'aria-label': 'Paginação' }, [
      element('div', { class: 'cm-data-table__pagination-group' }, [
        element('span', { class: 'cm-data-table__pagination-text' },
          sorted.value.length ? ((page.value - 1) * pageSize.value + 1) + '–' + Math.min(page.value * pageSize.value, sorted.value.length) + ' de ' + sorted.value.length + ' ' + props.recordName : '0 ' + props.recordName),
        props.pageSizes.length > 1 ? h(CmNativeSelect, {
          modelValue: String(pageSize.value), 'onUpdate:modelValue': (value: string) => { pageSize.value = Number(value) },
          'aria-label': 'Itens por página', class: 'cm-data-table__page-size',
          options: props.pageSizes.map(value => ({ value: String(value), label: String(value) })),
        }) : null,
      ]),
      element('div', { class: 'cm-data-table__pagination-group' }, [
        h(CmButton, { size: 'sm', variant: 'outline', disabled: page.value <= 1, 'aria-label': 'Página anterior', onClick: () => page.value-- }, { default: () => '‹' }),
        element('span', { class: 'cm-data-table__pagination-text' }, 'Página ' + page.value + ' de ' + maxPage.value),
        h(CmButton, { size: 'sm', variant: 'outline', disabled: page.value >= maxPage.value, 'aria-label': 'Próxima página', onClick: () => page.value++ }, { default: () => '›' }),
      ]),
    ])
    return () => [
      element('div', { class: classes('cm-data-table', props.density && 'cm-density-' + props.density) }, [
        element('div', { class: 'cm-table-scroll', tabindex: 0, role: 'region', 'aria-label': props.label }, [
          element('table', { class: 'cm-data-table__table', style: { minWidth: props.minWidth ? props.minWidth + 'px' : undefined } }, [
            element('thead', { class: 'cm-data-table__head' }, element('tr', {}, [
              ...visible.value.map(column => element('th', { key: column.key, scope: 'col',
                class: 'cm-data-table__header', 'aria-sort': sort.value?.key === column.key ? sort.value.direction : undefined },
              column.sortable ? element('button', {
                type: 'button', class: 'cm-data-table__header--sortable cm-data-table__header-content' + (column.align ? ' cm-data-table__header-content--' + column.align : ''),
                onClick: () => toggle(column),
              }, [column.header, element('span', { class: 'cm-data-table__sort-icon', 'aria-hidden': true },
                sort.value?.key === column.key ? sort.value.direction === 'ascending' ? '↑' : '↓' : '↕')])
                : element('span', { class: 'cm-data-table__header-content' + (column.align ? ' cm-data-table__header-content--' + column.align : '') }, column.header))),
              props.columnSettings ? element('th', { scope: 'col', class: 'cm-data-table__toggle-cell' }, settings()) : null,
            ])),
            element('tbody', { class: 'cm-data-table__body' }, pageRows.value.length ? pageRows.value.map((row, index) =>
              element('tr', { key: row.id, class: classes('cm-data-table__row cm-data-table__row--hoverable', index % 2 && 'cm-data-table__row--zebra') }, [
                ...visible.value.map(column => element('td', {
                  key: column.key, class: 'cm-data-table__cell cm-data-table__cell--' + (column.align ?? 'left'),
                }, renderCell(row, column))),
                props.columnSettings ? element('td', { class: 'cm-data-table__toggle-spacer' }) : null,
              ])) : element('tr', {}, element('td', { colspan: visible.value.length + Number(props.columnSettings) },
                h(CmEmpty, { title: props.emptyTitle, description: props.emptyDescription })))),
            slots.totals ? element('tfoot', { class: 'cm-data-table__foot' }, slots.totals({ columns: visible.value })) : null,
          ]),
        ]),
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