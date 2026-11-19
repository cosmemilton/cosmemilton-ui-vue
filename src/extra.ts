import { Teleport, computed, defineComponent, h, inject, onMounted, provide, ref, useId, watch, type InjectionKey, type PropType, type Ref } from 'vue'
import { CmButton } from './forms.js'
import { CmDialog, CmProgress } from './feedback.js'
import { CmRow, classes, component, element } from './primitives.js'

export const CmGrid = component('CmGrid', (a, s) => {
  const { as = 'div', span = 1, class: className, ...attrs } = a
  const base = typeof span === 'number' ? span : span.base ?? 1
  return element(as, { ...attrs, class: classes('cm-grid', className),
    style: [{ gridColumn: 'span ' + base }, attrs.style] }, s.default?.())
})

export const CmFrame = component('CmFrame', (a) => {
  const { title, src, framed, height = '26rem', class: className, ...attrs } = a
  return element('div', { class: classes('cm-frame', framed && 'cm-frame--framed', className) },
    element('iframe', { ...attrs, class: 'cm-frame__iframe', title, src, loading: 'lazy',
      style: { display: 'block', width: '100%', minHeight: height, border: 0 } }))
})

export const CmPagination = defineComponent({
  name: 'CmPagination',
  props: { page: { type: Number, default: 1 }, pageCount: { type: Number, default: 1 }, totalPages: Number },
  emits: ['change', 'update:page'],
  setup(props, { emit }) {
    const maximum = computed(() => Math.max(1, props.totalPages ?? props.pageCount))
    function change(page: number) {
      if (page < 1 || page > maximum.value || page === props.page) return
      emit('update:page', page); emit('change', page)
    }
    return () => element('nav', { class: 'cm-pagination', 'aria-label': 'Paginação' }, [
      h(CmButton, { variant: 'outline', size: 'sm', 'aria-label': 'Página anterior', disabled: props.page <= 1, onClick: () => change(props.page - 1) }, { default: () => '‹' }),
      element('span', { class: 'cm-pagination__summary', 'aria-live': 'polite' }, 'Página ' + props.page + ' de ' + maximum.value),
      h(CmButton, { variant: 'outline', size: 'sm', 'aria-label': 'Próxima página', disabled: props.page >= maximum.value, onClick: () => change(props.page + 1) }, { default: () => '›' }),
    ])
  },
})

export const CmPasswordStrength = defineComponent({
  name: 'CmPasswordStrength', props: { password: String, value: String, label: String },
  setup(props) {
    const score = computed(() => {
      const password = props.password ?? props.value ?? ''
      if (!password) return 0
      return Number(password.length >= 8) + Number(/[a-z]/.test(password) && /[A-Z]/.test(password))
        + Number(/[0-9]/.test(password)) + Number(/[^0-9A-Za-z]/.test(password))
    })
    return () => h(CmProgress, { value: score.value, max: 4, label: props.label ?? ('Força da senha: ' +
      ['Vazia', 'Fraca', 'Razoável', 'Boa', 'Forte'][score.value]), showValue: false })
  },
})

export const CmInputOTP = defineComponent({
  name: 'CmInputOTP',
  props: { length: { type: Number, default: 6 }, modelValue: String, label: String, disabled: Boolean },
  emits: ['update:modelValue', 'change', 'complete'],
  setup(props, { emit }) {
    const own = ref(props.modelValue ?? '')
    const value = computed(() => props.modelValue ?? own.value)
    const root = ref<HTMLElement>()
    function write(index: number, text: string) {
      const digits = text.replace(/\D/g, '')
      const next = (value.value.slice(0, index) + digits + value.value.slice(index + Math.max(1, digits.length))).slice(0, props.length)
      own.value = next
      emit('update:modelValue', next)
      emit('change', next)
      if (next.length === props.length) emit('complete', next)
      if (digits) root.value?.querySelectorAll('input')[Math.min(index + digits.length, props.length - 1)]?.focus()
    }
    return () => element('div', { ref: root, role: 'group', 'aria-label': props.label ?? 'Código de verificação', class: 'cm-input-otp' },
      Array.from({ length: props.length }, (_, index) => element('input', {
        key: index, 'aria-label': 'Dígito ' + (index + 1), type: 'text', inputmode: 'numeric', maxlength: 2, pattern: '[0-9]*',
        autocomplete: index === 0 ? 'one-time-code' : 'off', disabled: props.disabled, value: value.value[index] ?? '',
        class: 'cm-input-otp__digit',
        onInput: (event: Event) => write(index, (event.target as HTMLInputElement).value.slice(-1)),
        onPaste: (event: ClipboardEvent) => { event.preventDefault(); write(index, event.clipboardData?.getData('text') ?? '') },
        onKeydown: (event: KeyboardEvent) => {
          const fields = root.value?.querySelectorAll('input')
          if (event.key === 'ArrowLeft' || (event.key === 'Backspace' && !value.value[index])) fields?.[index - 1]?.focus()
          if (event.key === 'ArrowRight') fields?.[index + 1]?.focus()
        },
      })))
  },
})

type ChoiceContext = { value: Ref<string>; choose: (value: string) => void; name: string }
const choiceKey: InjectionKey<ChoiceContext> = Symbol('CmChoiceCardGroup')
export const CmChoiceCardGroup = defineComponent({
  name: 'CmChoiceCardGroup', props: { modelValue: String, defaultValue: String, label: String, name: String },
  emits: ['update:modelValue'],
  setup(props, { slots, emit }) {
    const own = ref(props.defaultValue ?? '')
    const value = computed(() => props.modelValue ?? own.value)
    provide(choiceKey, { value, name: props.name ?? useId(), choose: value => { own.value = value; emit('update:modelValue', value) } })
    return () => element('fieldset', { class: 'cm-choice-card-group' }, [
      props.label ? element('legend', {}, props.label) : null, slots.default?.(),
    ])
  },
})
function choiceCard(name: string, cssName: string) {
  return defineComponent({
    name,
    props: { title: String, label: String, description: String, value: String, name: String, checked: Boolean, modelValue: Boolean, disabled: Boolean, type: String },
    emits: ['update:modelValue', 'change'],
    setup(props, { slots, emit }) {
      const group = inject(choiceKey)
      return () => {
        const active = group ? group.value.value === props.value : props.modelValue || props.checked
        return element('label', { class: classes(cssName, active && cssName + '--selected') }, [
          element('input', { type: props.type ?? (group ? 'radio' : 'checkbox'), name: group?.name ?? props.name,
            value: props.value, checked: active, disabled: props.disabled, onChange: (event: Event) => {
              const value = (event.target as HTMLInputElement).checked
              if (value && group && props.value) group.choose(props.value)
              emit('update:modelValue', value); emit('change', value)
            }, class: cssName + '__input' }),
          element('span', { class: cssName + '__content' }, [
            slots.icon?.(), element('strong', { class: cssName + '__title' }, props.title ?? props.label),
            props.description ? element('small', { class: cssName + '__description' }, props.description) : null,
            slots.default?.(),
          ]),
        ])
      }
    },
  })
}
export const CmChoiceCard = choiceCard('CmChoiceCard', 'cm-choice-card')
export const CmOptionRow = choiceCard('CmOptionRow', 'cm-option-row')

export const CmPortal = defineComponent({
  name: 'CmPortal', props: { to: { type: String, default: 'body' } },
  setup(props, { slots }) {
    const ready = ref(false)
    onMounted(() => { ready.value = true })
    return () => ready.value ? h(Teleport, { to: props.to }, slots.default?.() ?? []) : null
  },
})
export const CmPortalPanel = component('CmPortalPanel', (a, s) => element('div', { ...a, class: classes('cm-portal-panel', a.class) }, s.default?.()))

export const CmProgressModal = defineComponent({
  name: 'CmProgressModal',
  props: { open: Boolean, title: String, description: String, value: Number,
    steps: { type: Array as PropType<{ label: string; status: string }[]>, default: () => [] } },
  emits: ['close'],
  setup(props, { slots, emit }) {
    return () => h(CmDialog, { open: props.open, title: props.title, description: props.description, onClose: () => emit('close') }, {
      default: () => [
        h(CmProgress, { label: props.title, value: props.value ?? props.steps.filter(item => item.status === 'completed').length,
          max: props.value === undefined ? Math.max(1, props.steps.length) : 100, showValue: true }),
        element('ol', { class: 'cm-progress-modal__steps' }, props.steps.map(item =>
          element('li', { class: 'cm-progress-modal__step', 'data-state': item.status }, item.label))),
        slots.default?.(),
      ],
    })
  },
})

export const CmResizable = component('CmResizable', (a, s) => {
  const { width = '20rem', height = '11rem', class: className, style, ...attrs } = a
  return element('div', { ...attrs, class: classes('cm-resizable', className), tabindex: a.tabindex ?? 0,
    style: [{ width, height, maxWidth: '100%', overflow: 'auto', resize: 'both', border: '1px solid var(--color-border)' }, style] }, s.default?.())
})
export const CmLogView = component('CmLogView', (a, s) => {
  const { lines = [], class: className, ...attrs } = a
  return element('pre', { ...attrs, class: classes('cm-log-view', className), tabindex: 0 },
    s.default?.() ?? (Array.isArray(lines) ? lines.map(item => typeof item === 'string' ? item : item.message).join('\n') : lines))
})

export const CmPopover = defineComponent({
  name: 'CmPopover',
  props: { title: String, open: Boolean },
  emits: ['update:open'],
  setup(props, { slots, emit }) {
    const visible = ref(false)
    const id = useId()
    watch(() => props.open, value => { visible.value = value })
    function toggle() { visible.value = !visible.value; emit('update:open', visible.value) }
    return () => element('span', { class: 'cm-vue-popover', style: { display: 'inline-flex', position: 'relative' },
      onKeydown: (event: KeyboardEvent) => { if (event.key === 'Escape' && visible.value) toggle() } }, [
      slots.trigger?.({ open: visible.value, toggle, triggerAttrs: { onClick: toggle, 'aria-expanded': visible.value, 'aria-controls': id } }) ??
        h(CmButton, { variant: 'outline', onClick: toggle, 'aria-expanded': visible.value, 'aria-controls': id }, { default: () => props.title ?? 'Abrir' }),
      visible.value ? element('div', { class: 'cm-popover__panel', id, style: {
        position: 'absolute', zIndex: 700, top: 'calc(100% + .4rem)', insetInlineStart: 0, minWidth: '10rem',
      } }, slots.default?.({ close: toggle })) : null,
    ])
  },
})

export const CmHoverCard = component('CmHoverCard', (a, s) => {
  return h(CmPopover, a, s)
})