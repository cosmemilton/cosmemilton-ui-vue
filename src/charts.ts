import { defineComponent, h, ref, useId, type PropType } from 'vue'
import { CmSectionHeader, classes, element } from './primitives.js'

export type ChartDatum = { label: string; value: number; tone?: string }
export type ComparisonDatum = { label: string; description?: string; left: number; right: number }
const tone = (name: string) => name === 'primary-soft'
  ? 'color-mix(in srgb, var(--color-primary) 52%, var(--color-card))'
  : 'var(--color-' + name + ', var(--color-primary))'
const format = new Intl.NumberFormat('pt-BR')
const svg = (tag: string, attrs: Record<string, unknown>, text?: string) => h(tag, attrs, text)
const stroke = 'var(--color-border)'
const muted = 'var(--color-muted-foreground)'
const chartText = { fill: muted, fontSize: 12, fontFamily: 'var(--font-family)' }

export const CmBarChart = defineComponent({
  name: 'CmBarChart',
  props: {
    data: { type: Array as PropType<ChartDatum[]>, required: true },
    height: { type: Number, default: 200 },
    valueFormat: { type: Function as PropType<(value: number) => string>, default: (value: number) => format.format(value) },
    title: String,
  },
  setup(props) {
    return () => {
      const width = 620
      const height = props.height
      const top = 18
      const bottom = height - 35
      const labelWidth = 48
      const step = (width - labelWidth - 12) / Math.max(1, props.data.length)
      const maximum = Math.max(1, ...props.data.map(item => item.value))
      return h('svg', {
        viewBox: '0 0 ' + width + ' ' + height, width: '100%', height, role: 'img',
        'aria-label': props.title ?? 'Gráfico de barras', class: 'cm-vue-bar-chart',
      }, [
        ...[0, 1, 2, 3].flatMap(index => {
          const y = top + (bottom - top) * index / 3
          const value = Math.round(maximum * (1 - index / 3))
          return [svg('line', { x1: labelWidth, x2: width - 7, y1: y, y2: y, stroke }),
            svg('text', { x: labelWidth - 5, y: y + 4, textAnchor: 'end', ...chartText }, format.format(value))]
        }),
        ...props.data.flatMap((item, index) => {
          const x = labelWidth + step * (index + .5)
          const barHeight = Math.max(0, item.value / maximum * (bottom - top))
          const barWidth = Math.min(52, step * .55)
          return [
            h('rect', { x: x - barWidth / 2, y: bottom - barHeight, width: barWidth, height: barHeight, rx: 5,
              fill: tone(item.tone ?? 'primary'), tabindex: 0, 'aria-label': item.label + ': ' + props.valueFormat(item.value) },
            [svg('title', {}, item.label + ': ' + props.valueFormat(item.value))]),
            svg('text', { x, y: height - 11, textAnchor: 'middle', ...chartText }, item.label),
          ]
        }),
      ])
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

type Axis = { label: string; tone?: string; domain?: [number, number]; valueFormat?: (value: number) => string; tickFormat?: (value: number) => string }
export const CmComparisonLineChart = defineComponent({
  name: 'CmComparisonLineChart',
  props: {
    data: { type: Array as PropType<ComparisonDatum[]>, required: true },
    leftAxis: Object as PropType<Axis>, rightAxis: Object as PropType<Axis>,
    leftLabel: { type: String, default: 'Receita' }, rightLabel: { type: String, default: 'Pedidos' },
    leftMax: Number, rightMax: Number, title: String, description: String, accessibleTableLabel: String,
    height: { type: Number, default: 216 }, curve: { type: String, default: 'smooth' },
    legendPosition: { type: String, default: 'header' }, xLabels: { type: String, default: 'responsive' },
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
      const leftColor = tone(leftAxis?.tone ?? 'primary')
      const rightColor = tone(rightAxis?.tone ?? 'primary-soft')
      const left = normalizedSeries(props.data.map(item => item.left), leftAxis?.domain?.[0], leftAxis?.domain?.[1] ?? props.leftMax)
      const right = normalizedSeries(props.data.map(item => item.right), rightAxis?.domain?.[0], rightAxis?.domain?.[1] ?? props.rightMax)
      const line = chartPath(left.points, props.curve === 'smooth')
      const dashed = chartPath(right.points, props.curve === 'smooth')
      const first = left.points[0]
      const last = left.points.at(-1)
      const active = props.data[limit(cursor.value)]
      const x = position(cursor.value, props.data.length)
      const label = leftLabel + ' e ' + rightLabel
      const rows = props.data.map(item => ({ point: item.description ?? item.label, left: leftFormat(item.left), right: rightFormat(item.right) }))
      const labels = props.data.map((point, index) => ({ point, index, compact: index === 0 ||
        index === Math.floor((props.data.length - 1) / 2) || index === props.data.length - 1 }))
        .filter(item => props.xLabels === 'responsive' || item.compact)
      return h(CmChartFrame, {
        title: props.title, description: props.description, empty: !props.data.length, legendPosition: props.legendPosition,
        legend: [{ label: leftLabel, color: leftColor, marker: 'line' }, { label: rightLabel, color: rightColor, marker: 'dashed' }],
        accessibleTableLabel: props.accessibleTableLabel ?? label,
        table: { columns: [{ key: 'point', header: 'Ponto' }, { key: 'left', header: leftLabel }, { key: 'right', header: rightLabel }], rows },
      }, { default: () => element('div', { class: 'cm-comparison-chart' }, [
        element('div', { class: 'cm-comparison-chart__axis', 'aria-hidden': true },
          left.ticks.map(value => element('span', {}, (leftAxis?.tickFormat ?? leftFormat)(value)))),
        element('div', { class: 'cm-comparison-chart__plot', role: 'slider', tabindex: 0, 'aria-label': label,
          'aria-valuemin': 1, 'aria-valuemax': props.data.length, 'aria-valuenow': cursor.value + 1,
          'aria-valuetext': active ? active.label + ' · ' + leftFormat(active.left) + ' · ' + rightFormat(active.right) : undefined,
          style: { height: props.height + 'px' }, onPointermove: inspect, onPointerdown: inspect,
          onPointerleave: (event: PointerEvent) => { if (document.activeElement !== event.currentTarget) inspecting.value = false },
          onFocus: () => { inspecting.value = true }, onBlur: () => { inspecting.value = false }, onKeydown: keyboard,
        }, [
          h('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': true }, [
            h('defs', {}, [h('linearGradient', { id: gradientId, x1: 0, x2: 0, y1: 0, y2: 1, gradientUnits: 'objectBoundingBox' }, [
              svg('stop', { offset: 0, 'stop-color': leftColor, 'stop-opacity': .22 }),
              svg('stop', { offset: 1, 'stop-color': leftColor, 'stop-opacity': .035 }),
            ])]),
            first && last ? svg('path', { d: line + ' L' + last.x + ' ' + left.baseline + ' L' + first.x + ' ' + left.baseline + ' Z', fill: 'url(#' + gradientId + ')' }) : null,
            ...[0, 25, 50, 75, 100].map(y => svg('line', { x1: 0, x2: 100, y1: y, y2: y,
              class: 'cm-comparison-chart__grid', 'vector-effect': 'non-scaling-stroke' })),
            svg('path', { d: line, fill: 'none', stroke: leftColor, 'stroke-width': 2, 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }),
            svg('path', { d: dashed, fill: 'none', stroke: rightColor, 'stroke-width': 2, 'stroke-linecap': 'round',
              'stroke-dasharray': '6 3', 'vector-effect': 'non-scaling-stroke' }),
            inspecting.value ? svg('line', { x1: x, x2: x, y1: 0, y2: 100,
              class: 'cm-comparison-chart__cursor', 'vector-effect': 'non-scaling-stroke' }) : null,
          ]),
          inspecting.value && active ? element('div', { class: 'cm-comparison-chart__tooltip', 'data-side': x < 50 ? 'end' : 'start', 'aria-hidden': true }, [
            element('strong', {}, active.description ?? active.label),
            element('span', {}, leftLabel + ' · ' + leftFormat(active.left)),
            element('span', {}, rightLabel + ' · ' + rightFormat(active.right)),
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
    step: Number,
    disabled: Boolean,
  },
  emits: ['change'],
  setup(props, { emit, attrs }) {
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
        emit('change', props.segments.map((segment, position) =>
          position === index ? adjusted : position === index + 1 ? pair - adjusted : segment.value))
      }
      return element('div', { ...attrs, class: classes('cm-ratio-bar', attrs.class),
        style: { '--cm-ratio-bar-height': typeof props.height === 'number' ? props.height + 'px' : props.height } }, [
        element('div', { class: 'cm-ratio-bar__track' }, props.segments.map((segment, position) =>
          element('div', { key: segment.id ?? position,
            class: 'cm-ratio-bar__segment cm-ratio-bar__segment--tone-' + (segment.tone ?? 'primary'),
            style: { width: percent(Math.max(0, segment.value)) },
          }, [
            segment.label ? element('span', { class: 'cm-ratio-bar__segment-label' }, segment.label) : null,
            segment.valueLabel ? element('span', { class: 'cm-ratio-bar__segment-value' }, segment.valueLabel) : null,
          ]))),
        left && right ? element('input', { type: 'range', min: minimum, max: maximum, value: left.value,
          step: props.step ?? Math.max(1, pair / 100), disabled: props.disabled, 'aria-label': props.handleLabel ?? 'Divisão',
          style: { display: 'block', width: '100%' }, onInput: (event: Event) => commit(Number((event.target as HTMLInputElement).value)),
        }) : null,
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
      const width = 560, top = 14, left = 68, right = width - 12, bottom = props.height - 21
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
            svg('text', { x: left - 8, y: y + 4, textAnchor: 'end', ...chartText }, props.valueFormat(tick))]
        }),
        props.area && first && last ? svg('path', { d: path + ' L' + last.x + ' ' + baseline + ' L' + first.x + ' ' + baseline + ' Z', fill: tone('primary'), opacity: .14 }) : null,
        svg('path', { d: path, fill: 'none', stroke: tone('primary'), 'stroke-linecap': 'round', 'stroke-width': 2.5 }),
        ...plotted.flatMap(({ x, y }, index) => {
          const item = props.data[index]!
          return [h('circle', { cx: x, cy: y, r: 3.3, fill: tone(item.tone ?? 'primary') }, [svg('title', {}, item.label + ' · ' + props.valueFormat(item.value))]),
            index === 0 || index === plotted.length - 1 || (plotted.length <= 8)
              ? svg('text', { x, y: props.height - 3, textAnchor: 'middle', ...chartText }, item.label) : null]
        }),
      ]) })
    }
  },
})
