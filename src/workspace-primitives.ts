import { Text, defineComponent, h, onBeforeUnmount, ref, watch, type PropType } from 'vue'
import { CmButton } from './forms.js'
import { useCmToast } from './feedback.js'

const dimensionType = [Number, String]
const dimension = (value: number | string | undefined) => typeof value === 'number' ? `${value}px` : value
const space = (value: number | string | undefined) => typeof value === 'string' && /^(none|xs|sm|md|lg|xl|2xl|3xl)$/.test(value)
  ? `var(--space-${value})` : dimension(value)

export const CmCanvas = defineComponent({
  name: 'CmCanvas', inheritAttrs: false,
  props: {
    align: { type: String, default: 'center' }, pattern: { type: String, default: 'dots' }, framed: Boolean,
    contentWidth: dimensionType, minHeight: { type: dimensionType, default: 280 }, padding: { type: dimensionType, default: 'md' },
  },
  setup(props, { attrs, slots }) {
    return () => h('div', {
      ...attrs, class: ['cm-canvas', `cm-canvas--${props.pattern}`, `cm-canvas--align-${props.align}`, attrs.class],
      style: [{ '--cm-canvas-content-width': dimension(props.contentWidth), '--cm-canvas-min-height': dimension(props.minHeight),
        '--cm-canvas-padding': space(props.padding) }, attrs.style],
    }, [h('div', { class: ['cm-canvas__content', props.framed && 'cm-canvas__content--framed'] }, slots.default?.())])
  },
})

export const CmInspector = defineComponent({
  name: 'CmInspector', inheritAttrs: false,
  props: { title: String, description: String, density: { type: String, default: 'compact' } },
  setup(props, { attrs, slots }) {
    return () => h('div', {
      ...attrs, class: ['cm-inspector', props.density !== 'default' && `cm-density-${props.density}`, attrs.class], 'data-density': props.density,
    }, [
      props.title || props.description || slots.title || slots.description ? h('div', { class: 'cm-inspector__heading' }, [
        props.title || slots.title ? h('h3', { class: 'cm-inspector__title' }, slots.title?.() ?? props.title) : null,
        props.description || slots.description ? h('div', { class: 'cm-inspector__description' }, slots.description?.() ?? props.description) : null,
      ]) : null,
      h('div', { class: 'cm-inspector__body' }, slots.default?.()),
      slots.footer ? h('div', { class: 'cm-inspector__footer' }, slots.footer()) : null,
    ])
  },
})

export const CmWorkbench = defineComponent({
  name: 'CmWorkbench', inheritAttrs: false,
  props: {
    inspectorOpen: { type: Boolean, default: true }, inspectorSticky: Boolean,
    inspectorWidth: { type: dimensionType, default: 320 }, inspectorOffset: { type: dimensionType, default: 0 }, inspectorMaxHeight: dimensionType,
  },
  setup(props, { attrs, slots }) {
    return () => h('div', {
      ...attrs, class: ['cm-workbench', attrs.class], style: [{
        '--cm-workbench-inspector-width': dimension(props.inspectorWidth), '--cm-workbench-inspector-offset': dimension(props.inspectorOffset),
        '--cm-workbench-inspector-max-height': dimension(props.inspectorMaxHeight),
      }, attrs.style],
    }, [
      slots.header ? h('div', { class: 'cm-workbench__header' }, slots.header()) : null,
      h('div', { class: 'cm-workbench__body', 'data-inspector': slots.inspector && props.inspectorOpen ? 'open' : 'closed' }, [
        h('div', { class: 'cm-workbench__main' }, [
          slots.toolbar ? h('div', { class: 'cm-workbench__toolbar' }, slots.toolbar()) : null, slots.default?.(),
        ]),
        slots.inspector ? h('div', {
          class: ['cm-workbench__inspector', props.inspectorSticky && 'cm-workbench__inspector--sticky'], hidden: !props.inspectorOpen,
        }, slots.inspector()) : null,
      ]),
      slots.footer ? h('div', { class: 'cm-workbench__footer' }, slots.footer()) : null,
    ])
  },
})

export const CmCodeBlock = defineComponent({
  name: 'CmCodeBlock', inheritAttrs: false,
  props: {
    code: String, language: String, filename: String, inline: Boolean, copyable: Boolean, maxHeight: dimensionType,
    copyLabel: { type: String, default: 'Copiar código' }, copiedLabel: { type: String, default: 'Copiado' },
    copyErrorLabel: { type: String, default: 'Não foi possível copiar' },
  },
  emits: { copy: (_value: string) => true, copyError: (_error: unknown) => true },
  setup(props, { attrs, slots, emit }) {
    const status = ref<'idle' | 'copied' | 'error'>('idle')
    const notices = useCmToast({ optional: true })
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    const reset = () => { attempt++; clearTimeout(timer); status.value = 'idle' }
    onBeforeUnmount(reset)
    watch(() => props.code, reset)

    async function copy(content: string) {
      if (!content) return
      reset()
      const request = attempt
      try {
        if (!globalThis.navigator?.clipboard) throw new Error(props.copyErrorLabel)
        await navigator.clipboard.writeText(content)
        if (attempt !== request) return
        status.value = 'copied'
        notices?.toast(props.copiedLabel, { tone: 'success' })
        emit('copy', content)
      } catch (error) {
        if (attempt !== request) return
        status.value = 'error'
        notices?.toast(props.copyErrorLabel, { tone: 'danger' })
        emit('copyError', error)
      }
      timer = setTimeout(reset, 1400)
    }

    return () => {
      const fallback = slots.default?.()
      const content = props.code ?? fallback?.filter(node => node.type === Text).map(node => node.children).join('') ?? ''
      if (props.inline) return h('code', { ...attrs, class: ['cm-code-inline', attrs.class] }, props.code ?? fallback)
      return h('figure', { ...attrs, class: ['cm-code-block', attrs.class], style: [{ '--cm-code-max-height': dimension(props.maxHeight) }, attrs.style] }, [
        props.filename || props.language || props.copyable ? h('figcaption', { class: 'cm-code-block__header' }, [
          h('span', { class: 'cm-code-block__identity' }, [
            props.filename ? h('span', { class: 'cm-code-block__filename' }, props.filename) : null,
            props.language ? h('span', { class: 'cm-code-block__language' }, props.language) : null,
          ]),
          props.copyable ? h(CmButton, {
            type: 'button', variant: 'ghost', tone: 'default', size: 'xs', shape: 'pill', class: 'cm-code-block__copy',
            disabled: !content, onClick: () => copy(content),
          }, { default: () => status.value === 'copied' ? props.copiedLabel : props.copyLabel }) : null,
        ]) : null,
        h('pre', { class: 'cm-code-block__pre', tabindex: 0 }, [h('code', {
          class: props.language ? `language-${props.language}` : undefined,
        }, props.code ?? fallback)]),
        slots.footer ? h('figcaption', { class: 'cm-code-block__footer' }, slots.footer()) : null,
        notices ? null : h('span', { class: 'cm-sr-only', role: 'status' }, status.value === 'error' ? props.copyErrorLabel : status.value === 'copied' ? props.copiedLabel : ''),
      ])
    }
  },
})

export type CmGaugeValue = { value: number; min: number; max: number; fraction: number; percent: number }
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const widths: Record<string, number> = { ' ': .35, '.': .38, ',': .38, ':': .4, ';': .4, '!': .46, '/': .46, '-': .42, '–': .6, '+': .84, '%': 1 }

function estimateWidth(value: string) {
  return [...value].reduce((sum, character) => {
    if (character in widths) return sum + widths[character]!
    const code = character.codePointAt(0) ?? 0
    if ((code >= 0x2e80 && code <= 0xa4cf) || (code >= 0xac00 && code <= 0xd7a3) || code >= 0x1f000) return sum + 1
    if (character >= '0' && character <= '9') return sum + .7
    return sum + (character === character.toUpperCase() && character !== character.toLowerCase() ? .78 : .66)
  }, 0)
}

export const CmGauge = defineComponent({
  name: 'CmGauge', inheritAttrs: false,
  props: {
    value: { type: Number, required: true }, min: { type: Number, default: 0 }, max: { type: Number, default: 100 }, size: { type: Number, default: 128 },
    arc: { type: Number, default: 360 }, thickness: Number, startAngle: Number, rounded: { type: Boolean, default: true }, label: String,
    tone: { type: String, default: 'primary' }, color: String, trackColor: String,
    showValue: { type: Boolean, default: true }, autoFitValue: { type: Boolean, default: true }, valueFontSize: Number, minValueFontSize: Number,
    valueFormat: Function as PropType<(item: CmGaugeValue) => string | number>,
  },
  setup(props, { attrs, slots }) {
    return () => {
      const { value, min, max, size } = props
      const arc = clamp(props.arc, 1, 360)
      const fraction = max > min ? clamp((value - min) / (max - min), 0, 1) : 0
      const percent = Math.round(fraction * 100)
      const strokeWidth = props.thickness ?? Math.max(6, Math.round(size * .1))
      const radius = Math.max((size - strokeWidth) / 2, 0)
      const center = size / 2
      const circumference = 2 * Math.PI * radius
      const track = circumference * arc / 360
      const progress = track * fraction
      const rotation = props.startAngle ?? (arc === 360 ? -90 : 90 + (360 - arc) / 2)
      const inset = Math.round(strokeWidth + size * .04)
      const display = props.valueFormat?.({ value, min, max, fraction, percent }) ?? `${percent}%`
      const nominal = Math.max(10, Math.round(props.valueFontSize ?? size * .22))
      const minimum = clamp(Math.round(props.minValueFontSize ?? nominal * .55), 8, nominal)
      const width = estimateWidth(String(display))
      const fitted = props.autoFitValue && width > 0 && size > inset * 2 ? clamp(Math.floor((size - inset * 2) / width), minimum, nominal) : nominal
      const circle = (className: string, length: number) => h('circle', {
        class: className, cx: center, cy: center, r: radius, fill: 'none', 'stroke-width': strokeWidth,
        'stroke-linecap': props.rounded ? 'round' : 'butt', 'stroke-dasharray': `${length} ${circumference}`,
        transform: `rotate(${rotation} ${center} ${center})`,
      })
      const content = slots.default?.() ?? (props.showValue || props.label ? [
        props.showValue ? h('span', { class: 'cm-gauge__value', style: { fontSize: `${fitted}px` } }, display) : null,
        props.label ? h('span', { class: 'cm-gauge__label' }, props.label) : null,
      ] : undefined)
      return h('div', {
        role: 'progressbar', 'aria-valuenow': clamp(value, min, max), 'aria-valuemin': min, 'aria-valuemax': max,
        'aria-valuetext': props.valueFormat ? undefined : `${percent}%`, 'aria-label': props.label ?? 'Progresso', ...attrs,
        class: ['cm-gauge', `cm-gauge--tone-${props.tone}`, attrs.class], style: [{
          width: `${size}px`, height: `${size}px`, '--cm-gauge-inset': `${inset}px`, '--cm-gauge-color': props.color,
          '--cm-gauge-track': props.trackColor,
        }, attrs.style],
      }, [
        h('svg', { class: 'cm-gauge__svg', viewBox: `0 0 ${size} ${size}`, width: size, height: size, 'aria-hidden': 'true', focusable: 'false' }, [
          circle('cm-gauge__track', track), progress > 0 ? circle('cm-gauge__progress', progress) : null,
        ]),
        content ? h('div', { class: 'cm-gauge__content', 'aria-hidden': 'true' }, content) : null,
      ])
    }
  },
})

export function cmSignalLevel(value: number, bars = 4) {
  return Number.isFinite(value) && value > 0 ? Math.min(bars, Math.max(1, Math.ceil(clamp(value, 0, 100) * bars / 100))) : 0
}

export const CmSignalBars = defineComponent({
  name: 'CmSignalBars', inheritAttrs: false,
  props: { bars: { type: Number, default: 4 }, label: String, level: Number, size: dimensionType, value: { type: Number, default: 0 } },
  setup(props, { attrs }) {
    return () => {
      const count = Number.isFinite(props.bars) ? Math.max(0, Math.floor(props.bars)) : 0
      const active = props.level ?? cmSignalLevel(props.value, count)
      return h('span', {
        role: props.label ? 'img' : undefined, 'aria-label': props.label, 'aria-hidden': props.label ? undefined : 'true', ...attrs,
        class: ['cm-signal-bars', attrs.class], style: [{ '--cm-signal-bars-size': dimension(props.size) }, attrs.style], 'data-level': active,
      }, Array.from({ length: count }, (_, index) => h('span', {
        key: index, class: ['cm-signal-bars__bar', index < active && 'cm-signal-bars__bar--on'], style: { height: `${((index + 1) / count) * 100}%` },
      })))
    }
  },
})
