import { defineComponent, h, ref, useId, type PropType } from 'vue'
import { barThicknessPixels, classes, element } from './primitives.js'

export type ChartDatum = { label: string; value: number; tone?: string; color?: string }
export type ComparisonDatum = { label: string; description?: string; left: number | null; right: number | null }
const tone = (name: string) => name === 'primary-soft'
  ? 'var(--cm-chart-primary-soft)'
  : 'var(--color-' + name + ', var(--color-primary))'
const format = new Intl.NumberFormat('pt-BR')
const svg = (tag: string, attrs: Record<string, unknown>, text?: string) => h(tag, attrs, text)
const stroke = 'var(--color-border)'
const muted = 'var(--color-muted-foreground)'
const chartText = { fill: muted, 'font-size': 12, 'font-family': 'var(--font-family)' }

export const CmBarChart = defineComponent({
  name: 'CmBarChart',
  props: {
    data: { type: Array as PropType<ChartDatum[]>, required: true },
    height: Number, orientation: { type: String as PropType<'vertical' | 'horizontal'>, default: 'vertical' },
    barThickness: [Number, String], showValues: { type: Boolean, default: true }, showGrid: { type: Boolean, default: true },
    legend: { type: [Boolean, Array] as PropType<boolean | LegendItem[]>, default: false }, legendPosition: String, legendLayout: String,
    valueFormat: { type: Function as PropType<(value: number) => string>, default: (value: number) => format.format(value) },
    title: String, description: String, accessibleTableLabel: String,
  },
  setup(props) {
    return () => {
      const horizontal = props.orientation === 'horizontal'
      const height = props.height ?? (horizontal ? undefined : 300)
      const maximum = Math.max(1, ...props.data.map(item => item.value))
      const thickness = barThicknessPixels(props.barThickness)
      const bars = props.data.map(item => ({ ...item, percent: 100 * Math.max(0, item.value) / maximum + '%',
        amount: props.valueFormat(item.value), color: item.color ?? tone(item.tone ?? 'primary') }))
      const legend = props.legend === true ? bars.map(bar => ({ label: bar.label, value: format.format(bar.value), color: bar.color }))
        : props.legend || []
      return h(CmChartFrame, {
        title: props.title, description: props.description, empty: !bars.length, height,
        legend, legendPosition: props.legendPosition, legendLayout: props.legendLayout,
        accessibleTableLabel: props.accessibleTableLabel ?? props.title ?? 'Dados do gráfico de barras',
        table: { columns: [{ key: 'label', header: 'Categoria' }, { key: 'value', header: 'Valor' }],
          rows: bars.map(bar => ({ label: bar.label, value: bar.amount })) },
      }, { default: () => horizontal
        ? element('div', { class: 'cm-bar-chart cm-bar-chart--horizontal' }, bars.map(bar =>
          element('div', { key: bar.label, class: 'cm-bar-chart__row' }, [
            element('div', { class: 'cm-bar-chart__row-header' }, [
              element('span', { class: 'cm-bar-chart__label' }, bar.label),
              props.showValues ? element('span', { class: 'cm-bar-chart__value' }, bar.amount) : null,
            ]),
            element('div', { class: 'cm-bar-chart__track', style: { height: thickness } },
              element('div', { class: 'cm-bar-chart__fill cm-bar-chart__fill--horizontal', style: { width: bar.percent, backgroundColor: bar.color } })),
          ])))
        : element('div', { class: 'cm-bar-chart cm-bar-chart--vertical', style: { height: height + 'px' } }, [
          props.showGrid ? element('div', { class: 'cm-bar-chart__grid', 'aria-hidden': true },
            [0, 1, 2, 3, 4].map(index => element('div', { key: index, class: 'cm-bar-chart__grid-line' }))) : null,
          element('div', { class: 'cm-bar-chart__plot' }, bars.map(bar =>
            element('div', { key: bar.label, class: 'cm-bar-chart__column' }, [
              element('div', { class: 'cm-bar-chart__column-inner' }, [
                props.showValues ? element('span', { class: 'cm-bar-chart__value cm-bar-chart__value--above' }, bar.amount) : null,
                element('div', { class: 'cm-bar-chart__fill cm-bar-chart__fill--vertical', style: { height: bar.percent, backgroundColor: bar.color } }),
              ]),
              element('span', { class: 'cm-bar-chart__label cm-bar-chart__label--axis' }, bar.label),
            ]))),
        ]) })
    }
  },
})

type LegendItem = { id?: string; label: string; value?: string; color?: string; tone?: string; marker?: string }
type ChartTable = { caption?: string; columns: { key: string; header: string }[]; rows: Record<string, string | number>[] }

export const CmChartFrame = defineComponent({
  name: 'CmChartFrame',
  props: {
    title: String, description: String, height: Number, loading: Boolean, empty: Boolean,
    legendPosition: { type: String, default: 'footer' }, legendLayout: { type: String, default: 'inline' },
    legend: { type: Array as PropType<LegendItem[]>, default: () => [] },
    table: Object as PropType<ChartTable>, accessibleTableLabel: String,
  },
  setup(props, { slots, attrs }) {
    return () => {
      const legend = props.legend.length ? element('ul', { class: 'cm-chart-frame__legend',
        'data-layout': props.legendLayout, 'aria-label': 'Legenda' }, props.legend.map(item =>
        element('li', { key: item.id ?? item.label, class: 'cm-chart-frame__legend-item',
          style: { '--cm-chart-legend-color': item.color ?? tone(item.tone ?? 'primary') } }, [
          element('span', { class: 'cm-chart-frame__legend-swatch', 'data-marker': item.marker, 'aria-hidden': true }),
          element('span', { class: 'cm-chart-frame__legend-label' }, item.label),
          item.value ? element('span', { class: 'cm-chart-frame__legend-value' }, item.value) : null,
        ]))) : null
      const atHeader = props.legendPosition === 'header' && legend
      return element('div', { ...attrs, class: classes('cm-chart-frame', attrs.class), 'aria-busy': props.loading || undefined,
        'data-cm-chart-frame-height': props.height ? '' : undefined,
        style: [{ '--cm-chart-frame-height': props.height ? props.height + 'px' : undefined }, attrs.style] }, [
        (props.title || props.description || slots.title || slots.actions || atHeader) ?
          element('div', { class: classes('cm-chart-frame__header', (atHeader || slots.actions) && 'cm-chart-frame__header--with-actions') }, [
            element('div', { class: 'cm-chart-frame__heading' }, [
              props.title || slots.title ? element('div', { class: 'cm-chart-frame__title' },
                slots.title?.() ?? element('h2', { class: 'cm-text cm-text--md cm-text--semibold cm-text--family-heading' }, props.title)) : null,
              props.description ? element('div', { class: 'cm-chart-frame__description' }, props.description) : null,
            ]),
            atHeader ? legend : null,
            slots.actions ? element('div', { class: 'cm-chart-frame__actions' }, slots.actions()) : null,
          ]) : null,
        element('div', { class: 'cm-chart-frame__body' },
          props.loading || props.empty ? element('div', { class: 'cm-chart-frame__state', role: 'status' },
            props.loading ? 'Carregando dados…' : 'Nenhum dado disponível') : slots.default?.()),
        props.legendPosition === 'footer' ? legend : null,
        props.table && !props.loading && !props.empty ? element('table', { class: 'cm-sr-only cm-chart-frame__table' }, [
          element('caption', {}, props.accessibleTableLabel ?? props.table.caption ?? props.title),
          element('thead', {}, element('tr', {}, props.table.columns.map(column => element('th', { scope: 'col' }, column.header)))),
          element('tbody', {}, props.table.rows.map(row => element('tr', {}, props.table!.columns.map(column => element('td', {}, String(row[column.key] ?? '')))))),
        ]) : null,
      ])
    }
  },
})

type XY = { x: number; y: number }
function chartPath(points: XY[], smooth: boolean) {
  const start = points[0]
  if (!start) return ''
  let path = 'M' + start.x + ' ' + start.y
  if (points.length === 1) return path + 'l0 0'
  points.slice(1).forEach((point, offset) => {
    const index = offset + 1
    const previous = points[index - 1]!
    if (!smooth) { path += ' L' + point.x + ' ' + point.y; return }
    const midpoint = (previous.x + point.x) / 2
    path += ' C' + midpoint + ' ' + previous.y + ' ' + midpoint + ' ' + point.y + ' ' + point.x + ' ' + point.y
  })
  return path
}

function position(index: number, count: number) {
  return count > 1 ? 100 * index / (count - 1) : 50
}

function normalizedSeries(values: number[], requestedMin?: number, requestedMax?: number) {
  const min = Math.min(0, requestedMin ?? 0, ...values)
  const max = Math.max(1, requestedMax ?? 1, ...values)
  const range = max - min
  return {
    baseline: 100 * (1 + min / range),
    points: values.map((value, index) => ({ x: position(index, values.length), y: 100 * (1 - (value - min) / range) })),
    ticks: [1, .75, .50, .25, 0].map(fraction => min + range * fraction),
  }
}

type Axis = { label: string; tone?: string; color?: string; area?: boolean; domain?: [number, number]; valueFormat?: (value: number) => string; tickFormat?: (value: number) => string }
function comparisonSeries(values: (number | null)[], domain: [number, number] | undefined, smooth: boolean, filled: boolean) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value))
  const bounds = domain && domain.every(Number.isFinite) && domain[0] < domain[1] ? domain : []
  const min = Math.min(0, ...bounds, ...valid)
  const max = Math.max(0, ...bounds, ...valid)
  const range = max - min || 1
  const baseline = 100 * (1 + min / range)
  const paths: string[] = []
  const areas: string[] = []
  let run: XY[] = []
  function finishRun() {
    if (!run.length) return
    const path = chartPath(run, smooth)
    paths.push(path)
    if (filled && run.length > 1) areas.push(path + ' L' + run.at(-1)!.x + ' ' + baseline + ' L' + run[0]!.x + ' ' + baseline + ' Z')
    run = []
  }
  values.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) { finishRun(); return }
    run.push({ x: position(index, values.length), y: 100 * (1 - (value - min) / range) })
  })
  finishRun()
  return { path: paths.join(' '), area: areas.join(' '), ticks: [1, .75, .5, .25, 0].map(fraction => min + fraction * range) }
}
export const CmComparisonLineChart = defineComponent({
  name: 'CmComparisonLineChart',
  props: {
    data: { type: Array as PropType<ComparisonDatum[]>, required: true },
    leftAxis: Object as PropType<Axis>, rightAxis: Object as PropType<Axis>,
    leftLabel: { type: String, default: 'Receita' }, rightLabel: { type: String, default: 'Pedidos' },
    leftMax: Number, rightMax: Number, title: String, description: String, accessibleTableLabel: String,
    height: { type: Number, default: 192 }, curve: { type: String, default: 'linear' },
    legendPosition: { type: String, default: 'footer' }, xLabels: { type: String, default: 'compact' },
    leftFormat: { type: Function as PropType<(value: number) => string>, default: (value: number) => format.format(value) },
  },
  setup(props) {
    const cursor = ref(0)
    const inspecting = ref(false)
    const gradientId = useId()
    const limit = (value: number) => Math.max(0, Math.min(props.data.length - 1, value))
    function inspect(event: PointerEvent) {
      const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
      if (bounds.width <= 0) return
      cursor.value = limit(Math.round((event.clientX - bounds.left) / bounds.width * (props.data.length - 1)))
      inspecting.value = true
    }
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        inspecting.value = false
        return
      }
      const value = ({ ArrowLeft: cursor.value - 1, ArrowDown: cursor.value - 1, ArrowRight: cursor.value + 1, ArrowUp: cursor.value + 1, Home: 0,
        End: props.data.length - 1 } as Record<string, number>)[event.key]
      if (value === undefined) return
      event.preventDefault()
      cursor.value = limit(value); inspecting.value = true
    }
    return () => {
      const leftAxis = props.leftAxis
      const rightAxis = props.rightAxis
      const leftLabel = leftAxis?.label ?? props.leftLabel
      const rightLabel = rightAxis?.label ?? props.rightLabel
      const leftFormat = leftAxis?.valueFormat ?? props.leftFormat
      const rightFormat = rightAxis?.valueFormat ?? format.format
      const leftColor = leftAxis?.color ?? tone(leftAxis?.tone ?? 'primary')
      const rightColor = rightAxis?.color ?? tone(rightAxis?.tone ?? 'info')
      const left = comparisonSeries(props.data.map(item => item.left), leftAxis?.domain ?? (props.leftMax ? [0, props.leftMax] : undefined), props.curve === 'smooth', !!leftAxis?.area)
      const right = comparisonSeries(props.data.map(item => item.right), rightAxis?.domain ?? (props.rightMax ? [0, props.rightMax] : undefined), props.curve === 'smooth', !!rightAxis?.area)
      const active = props.data[limit(cursor.value)]
      const x = position(limit(cursor.value), props.data.length)
      const label = leftLabel + ' e ' + rightLabel
      const formatPoint = (value: number | null, formatter: (value: number) => string) => value !== null && Number.isFinite(value) ? formatter(value) : '—'
      const rows = props.data.map(item => ({ point: item.description ?? item.label, left: formatPoint(item.left, leftFormat), right: formatPoint(item.right, rightFormat) }))
      const last = props.data.length - 1
      const middle = Math.floor(last / 2)
      const labelIndices = new Set([0, middle, last])
      if (props.xLabels === 'responsive') {
        const count = Math.min(8, props.data.length)
        for (let i = 1; i < count - 1; i++) labelIndices.add(i === Math.floor((count - 1) / 2) ? middle : Math.round(i * last / (count - 1)))
      }
      const labels = props.data.map((point, index) => ({ point, index, compact: index === 0 || index === middle || index === last }))
        .filter(item => labelIndices.has(item.index))
      return h(CmChartFrame, {
        title: props.title, description: props.description, empty: !left.path && !right.path, legendPosition: props.legendPosition,
        legend: [{ label: leftLabel, color: leftColor, marker: props.legendPosition === 'header' ? 'line' : 'dot' },
          { label: rightLabel, color: rightColor, marker: props.legendPosition === 'header' ? 'dashed' : 'dot' }],
        accessibleTableLabel: props.accessibleTableLabel ?? label,
        table: { columns: [{ key: 'point', header: 'Ponto' }, { key: 'left', header: leftLabel }, { key: 'right', header: rightLabel }], rows },
      }, { default: () => element('div', { class: 'cm-comparison-chart' }, [
        element('div', { class: 'cm-comparison-chart__axis', 'aria-hidden': true },
          left.ticks.map(value => element('span', {}, (leftAxis?.tickFormat ?? leftFormat)(value)))),
        element('div', { class: 'cm-comparison-chart__plot', role: 'slider', tabindex: 0, 'aria-label': label,
          'aria-valuemin': 1, 'aria-valuemax': props.data.length, 'aria-valuenow': limit(cursor.value) + 1,
          'aria-valuetext': active ? (active.description ?? active.label) + ' · ' + leftLabel + ': ' + formatPoint(active.left, leftFormat) + ' · ' + rightLabel + ': ' + formatPoint(active.right, rightFormat) : undefined,
          style: { height: props.height + 'px' }, onPointermove: inspect, onPointerdown: inspect,
          onPointerleave: (event: PointerEvent) => { if (document.activeElement !== event.currentTarget) inspecting.value = false },
          onFocus: () => { inspecting.value = true }, onBlur: () => { inspecting.value = false }, onKeydown: keyboard,
        }, [
          h('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': true }, [
            ...[{ area: left.area, color: leftColor }, { area: right.area, color: rightColor }].map(({ area, color }, index) => area ? h('g', { key: index }, [
              h('defs', {}, [h('linearGradient', { id: gradientId + '-' + index, x1: 0, x2: 0, y1: 0, y2: 1, gradientUnits: 'objectBoundingBox' }, [
                svg('stop', { offset: 0, 'stop-color': color, 'stop-opacity': .22 }),
                svg('stop', { offset: 1, 'stop-color': color, 'stop-opacity': .035 }),
              ])]),
              svg('path', { d: area, fill: 'url(#' + gradientId + '-' + index + ')' }),
            ]) : null),
            ...[0, 25, 50, 75, 100].map(y => svg('line', { x1: 0, x2: 100, y1: y, y2: y,
              class: 'cm-comparison-chart__grid', 'vector-effect': 'non-scaling-stroke' })),
            svg('path', { d: left.path, fill: 'none', stroke: leftColor, 'stroke-width': 2, 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }),
            svg('path', { d: right.path, fill: 'none', stroke: rightColor, 'stroke-width': 2, 'stroke-linecap': 'round',
              'stroke-dasharray': '6 3', 'vector-effect': 'non-scaling-stroke' }),
            inspecting.value ? svg('line', { x1: x, x2: x, y1: 0, y2: 100,
              class: 'cm-comparison-chart__cursor', 'vector-effect': 'non-scaling-stroke' }) : null,
          ]),
          inspecting.value && active ? element('div', { class: 'cm-comparison-chart__tooltip', 'data-side': x < 50 ? 'end' : 'start', 'aria-hidden': true }, [
            element('strong', {}, active.description ?? active.label),
            element('span', {}, leftLabel + ' · ' + formatPoint(active.left, leftFormat)),
            element('span', {}, rightLabel + ' · ' + formatPoint(active.right, rightFormat)),
          ]) : null,
        ]),
        element('div', { class: 'cm-comparison-chart__axis', 'aria-hidden': true },
          right.ticks.map(value => element('span', {}, (rightAxis?.tickFormat ?? rightFormat)(value)))),
        element('div', { class: 'cm-comparison-chart__labels', 'aria-hidden': true }, labels.map(({ point, index, compact }) =>
          element('span', { style: { left: position(index, props.data.length) + '%' }, 'data-compact': compact }, point.label))),
      ]) })
    }
  },
})

const slicePercent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })
export const CmDonutChart = defineComponent({
  name: 'CmDonutChart',
  props: {
    data: { type: Array as PropType<ChartDatum[]>, required: true },
    title: String, description: String, totalLabel: { type: String, default: 'Total' },
    variant: { type: String, default: 'continuous' }, legendLayout: { type: String, default: 'list' },
    accessibleTableLabel: String,
    valueFormat: { type: Function as PropType<(value: number) => string>, default: (value: number) => format.format(value) },
  },
  setup(props) {
    return () => {
      const valid = props.data.filter(item => item.value >= 0 && Number.isFinite(item.value))
      const total = valid.reduce((sum, item) => sum + item.value, 0)
      const radius = 42
      const circumference = 2 * Math.PI * radius
      let offset = 0
      const slices = valid.map(item => {
        const fraction = total > 0 ? item.value / total : 0
        const start = offset
        offset += fraction
        return { ...item, fraction, start, amount: props.valueFormat(item.value), share: slicePercent.format(fraction), color: tone(item.tone ?? 'primary') }
      })
      const positive = slices.filter(item => item.fraction > 0)
      const segmented = props.variant === 'segmented' && positive.length > 1
      return h(CmChartFrame, {
        title: props.title, description: props.description, empty: total === 0, legendLayout: props.legendLayout,
        accessibleTableLabel: props.accessibleTableLabel ?? props.title ?? 'Distribuição por categoria',
        legend: slices.map(slice => ({ label: slice.label, value: slice.share, color: slice.color })),
        table: { columns: [{ key: 'label', header: 'Categoria' }, { key: 'amount', header: 'Valor' }, { key: 'share', header: 'Percentual' }],
          rows: slices.map(({ label, amount, share }) => ({ label, amount, share })) },
      }, { default: () => element('div', { class: 'cm-donut-chart', 'data-variant': props.variant }, [
        h('svg', { viewBox: '0 0 100 100', 'aria-hidden': true }, positive.map(slice => {
          const arc = slice.fraction * circumference
          const width = segmented ? Math.min(10, arc * .65) : 10
          const trim = segmented ? (width + Math.min(3, arc * .25)) / circumference * 100 : 0
          const dash = slice.fraction * 100 - trim
          return h('circle', { cx: 50, cy: 50, r: radius, fill: 'none', stroke: slice.color, pathLength: 100,
            transform: 'rotate(-90 50 50)', 'stroke-width': width, 'stroke-linecap': segmented ? 'round' : undefined,
            'stroke-dasharray': dash + ' ' + (100 - dash), 'stroke-dashoffset': -(slice.start * 100 + trim / 2),
          }, [svg('title', {}, slice.label + ' · ' + slice.amount + ' · ' + slice.share)])
        })),
        element('div', { class: 'cm-donut-chart__center' }, [
          element('strong', {}, props.valueFormat(total)), element('span', {}, props.totalLabel),
        ]),
      ]) })
    }
  },
})

export const CmRatioBar = defineComponent({
  name: 'CmRatioBar',
  props: {
    segments: { type: Array as PropType<{ id?: string; label?: string; value: number; valueLabel?: string; tone?: string; min?: number; max?: number }[]>, required: true },
    height: [Number, String],
    handleIndex: Number,
    handleLabel: String,
    valueText: Function as PropType<(values: number[]) => string>,
    step: Number,
    disabled: Boolean,
  },
  emits: ['change'],
  setup(props, { emit, attrs }) {
    const track = ref<HTMLElement>()
    let pointer: number | undefined
    return () => {
      const total = props.segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)
      const percent = (value: number) => total > 0 ? value / total * 100 + '%' : '0%'
      const index = props.handleIndex
      const left = index === undefined ? undefined : props.segments[index]
      const right = index === undefined ? undefined : props.segments[index + 1]
      const pair = left && right ? left.value + right.value : 0
      const minimum = left && right ? Math.max(left.min ?? 0, pair - (right.max ?? pair)) : 0
      const maximum = left && right ? Math.max(minimum, Math.min(left.max ?? pair, pair - (right.min ?? 0))) : 0
      function commit(value: number) {
        if (index === undefined || props.disabled || !left || !right) return
        const adjusted = Math.min(maximum, Math.max(minimum, value))
        if (adjusted === left.value) return
        emit('change', props.segments.map((segment, position) =>
          position === index ? adjusted : position === index + 1 ? pair - adjusted : segment.value))
      }
      const offset = props.segments.slice(0, index ?? 0).reduce((sum, segment) => sum + Math.max(0, segment.value), 0)
      function keydown(event: KeyboardEvent) {
        if (props.disabled || !left) return
        const step = props.step ?? Math.max(1, pair / 100)
        const positions: Record<string, number> = { Home: minimum, End: maximum,
          ArrowRight: left.value + step, ArrowUp: left.value + step, ArrowLeft: left.value - step, ArrowDown: left.value - step,
          PageUp: left.value + 10 * step, PageDown: left.value - 10 * step }
        if (!Object.hasOwn(positions, event.key)) return
        event.preventDefault()
        commit(positions[event.key])
      }
      function start(event: PointerEvent) {
        if (props.disabled || pointer !== undefined || event.button !== 0) return
        const handle = event.currentTarget as HTMLElement
        pointer = event.pointerId
        handle.setPointerCapture(event.pointerId)
        handle.focus()
        event.preventDefault()
      }
      function move(event: PointerEvent) {
        const bounds = track.value?.getBoundingClientRect()
        if (event.pointerId !== pointer || !bounds?.width) return
        commit(Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * total - offset)
      }
      function stop(event: PointerEvent) {
        if (event.pointerId === pointer) pointer = undefined
      }
      const handle = left && right ? element('div', { class: 'cm-ratio-bar__handle', role: 'slider',
        tabindex: props.disabled ? -1 : 0, 'aria-label': props.handleLabel ?? 'Divisão', 'aria-orientation': 'horizontal',
        'aria-valuemin': minimum, 'aria-valuemax': maximum, 'aria-valuenow': left.value, 'aria-disabled': props.disabled || undefined,
        'aria-valuetext': props.valueText?.(props.segments.map(segment => segment.value)), style: { left: percent(offset + left.value) },
        onKeydown: keydown, onPointerdown: start, onPointermove: move, onPointerup: stop, onPointercancel: stop, onLostpointercapture: stop,
      }) : null
      return element('div', { ...attrs, class: classes('cm-ratio-bar', attrs.class), 'data-disabled': props.disabled ? '' : undefined,
        style: { '--cm-ratio-bar-height': typeof props.height === 'number' ? props.height + 'px' : props.height } }, [
        element('div', { class: 'cm-ratio-bar__track', ref: track }, [...props.segments.map((segment, position) =>
          element('div', { key: segment.id ?? position,
            class: 'cm-ratio-bar__segment cm-ratio-bar__segment--tone-' + (segment.tone ?? (position === 0 ? 'default' : 'primary')),
            style: { width: percent(Math.max(0, segment.value)) },
          }, [
            segment.label ? element('span', { class: 'cm-ratio-bar__segment-label' }, segment.label) : null,
            segment.valueLabel ? element('span', { class: 'cm-ratio-bar__segment-value' }, segment.valueLabel) : null,
          ])), handle]),
      ])
    }
  },
})
export const CmLineChart = defineComponent({
  name: 'CmLineChart',
  props: {
    data: { type: Array as PropType<ChartDatum[]>, required: true },
    title: String, description: String, curve: { type: String, default: 'smooth' },
    area: Boolean, height: { type: Number, default: 192 },
    valueFormat: { type: Function as PropType<(value: number) => string>, default: (value: number) => format.format(value) },
  },
  setup(props) {
    return () => {
      const series = normalizedSeries(props.data.map(item => item.value))
      const width = 560, top = 14, left = 68, right = width - 12, bottom = props.height - 26
      const plotted = series.points.map(item => ({ x: left + item.x / 100 * (right - left), y: top + item.y / 100 * (bottom - top) }))
      const path = chartPath(plotted, props.curve === 'smooth')
      const first = plotted[0], last = plotted.at(-1)
      const baseline = top + series.baseline / 100 * (bottom - top)
      return h(CmChartFrame, { title: props.title, description: props.description, empty: !props.data.length,
        table: { columns: [{ key: 'label', header: 'Período' }, { key: 'value', header: 'Valor' }],
          rows: props.data.map(item => ({ label: item.label, value: props.valueFormat(item.value) })) },
      }, { default: () => h('svg', { width: '100%', height: props.height, viewBox: '0 0 ' + width + ' ' + props.height, 'aria-hidden': true }, [
        ...series.ticks.flatMap((tick, index) => {
          const y = top + index / 4 * (bottom - top)
          return [svg('line', { x1: left, x2: right, y1: y, y2: y, stroke }),
            svg('text', { x: left - 8, y: y + 4, 'text-anchor': 'end', ...chartText }, props.valueFormat(tick))]
        }),
        props.area && first && last ? svg('path', { d: path + ' L' + last.x + ' ' + baseline + ' L' + first.x + ' ' + baseline + ' Z', fill: tone('primary'), opacity: .14 }) : null,
        svg('path', { d: path, fill: 'none', stroke: tone('primary'), 'stroke-linecap': 'round', 'stroke-width': 2.5 }),
        ...plotted.flatMap(({ x, y }, index) => {
          const item = props.data[index]!
          const firstLabel = index === 0
          const lastLabel = index === plotted.length - 1
          return [h('circle', { cx: x, cy: y, r: 3.3, fill: tone(item.tone ?? 'primary') }, [svg('title', {}, item.label + ' · ' + props.valueFormat(item.value))]),
            firstLabel || lastLabel || plotted.length <= 8
              ? svg('text', { x, y: props.height - 5, 'text-anchor': firstLabel ? 'start' : lastLabel ? 'end' : 'middle', ...chartText }, item.label) : null]
        }),
      ]) })
    }
  },
})
