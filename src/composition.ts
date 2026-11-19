import { computed, defineComponent, h, inject, provide, ref, useId, type InjectionKey, type PropType, type Ref } from 'vue'
import { CmButton, CmField, CmNativeInput } from './forms.js'
import { CmDialog, CmDropdownMenu, type MenuItem } from './feedback.js'
import { CmCard, CmRow, CmSectionHeader, CmStack, classes, component, element, normalizeAttrs } from './primitives.js'

export const CmDisclosure = component('CmDisclosure', (a, s) => {
  const { title, defaultOpen, open = defaultOpen, class: className, ...attrs } = a
  return element('details', { ...attrs, open, class: classes('cm-disclosure', className) }, [
    element('summary', { class: 'cm-disclosure__summary' }, s.title?.() ?? title),
    element('div', { class: 'cm-disclosure__content' }, s.default?.()),
  ])
})

export const CmCollapsible = component('CmCollapsible', (a, s) => {
  const { title, defaultOpen, ...attrs } = a
  return h(CmDisclosure, { ...attrs, title, defaultOpen }, s)
})

export const CmAccordion = defineComponent({
  name: 'CmAccordion',
  props: { items: Array as PropType<{ id?: string; title?: string; label?: string; content?: string }[]>, type: String, defaultValue: String },
  setup(props, { slots }) {
    const group = useId()
    return () => element('div', { class: 'cm-accordion' }, props.items ? props.items.map((item, index) =>
      element('details', { key: item.id ?? index, name: props.type === 'multiple' ? undefined : group, open: item.id === props.defaultValue,
        class: 'cm-accordion__item' }, [
        element('summary', { class: 'cm-accordion__trigger' }, item.title ?? item.label),
        element('div', { class: 'cm-accordion__body' }, slots.content?.({ item }) ?? item.content),
      ])) : slots.default?.())
  },
})

type TabsContext = { value: Ref<string>; select: (value: string) => void; id: string }
const tabsKey: InjectionKey<TabsContext> = Symbol('CmTabs')
export const CmTabs = defineComponent({
  name: 'CmTabs', props: { modelValue: String, defaultValue: String }, emits: ['update:modelValue'],
  setup(props, { slots, emit }) {
    const own = ref(props.defaultValue ?? '')
    const value = computed(() => props.modelValue ?? own.value)
    const context = { id: useId(), value, select: (next: string) => { own.value = next; emit('update:modelValue', next) } }
    provide(tabsKey, context)
    return () => element('div', { class: 'cm-tabs' }, slots.default?.())
  },
})
export const CmTabsList = component('CmTabsList', (a, s) => element('div', { ...a, role: 'tablist', class: classes('cm-tabs__list', a.class),
  onKeydown: (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    const tabs = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')]
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    event.preventDefault()
    tabs[next]?.focus()
    tabs[next]?.click()
  },
}, s.default?.()))
export const CmTabsTrigger = defineComponent({
  name: 'CmTabsTrigger', props: { value: { type: String, required: true }, disabled: Boolean },
  setup(props, { slots }) {
    const tabs = inject(tabsKey)
    return () => {
      const active = tabs?.value.value === props.value
      return element('button', { type: 'button', role: 'tab', disabled: props.disabled, tabindex: active ? 0 : -1,
        class: classes('cm-tabs__trigger', active && 'cm-tabs__trigger--active'), 'data-state': active ? 'active' : 'inactive',
        id: tabs?.id + '-tab-' + props.value, 'aria-controls': tabs?.id + '-panel-' + props.value,
        'aria-selected': active, onClick: () => tabs?.select(props.value),
      }, slots.default?.())
    }
  },
})
export const CmTabsContent = defineComponent({
  name: 'CmTabsContent', props: { value: { type: String, required: true } },
  setup(props, { slots }) {
    const tabs = inject(tabsKey)
    return () => element('div', { role: 'tabpanel', tabindex: 0, class: 'cm-tabs__content',
      hidden: tabs?.value.value !== props.value, id: tabs?.id + '-panel-' + props.value,
      'aria-labelledby': tabs?.id + '-tab-' + props.value }, slots.default?.())
  },
})

export const CmAvatar = component('CmAvatar', (a, s) => {
  const { src, alt = '', fallback, size = 'md', class: className, ...attrs } = a
  return element('span', { ...attrs, class: classes('cm-avatar', 'cm-avatar--' + size, className) },
    src ? element('img', { src, alt, class: 'cm-avatar__image' })
      : element('span', { class: 'cm-avatar__fallback' }, s.default?.() ?? fallback ?? alt.slice(0, 2)))
})
export const CmLink = component('CmLink', (a, s) => {
  const { href, variant = 'default', tone = 'default', class: className, ...attrs } = a
  return element('a', { ...attrs, href, class: classes('cm-link', 'cm-link--' + variant, 'cm-link--tone-' + tone, className) }, s.default?.())
})
export const CmButtonGroup = component('CmButtonGroup', (a, s) => {
  const { joined, orientation = 'horizontal', class: className, ...attrs } = a
  return element('div', { ...attrs, role: 'group', class: classes('cm-button-group', 'cm-button-group--' + orientation, joined !== undefined && joined !== false && 'cm-button-group--joined', className) }, s.default?.())
})
export const CmSplitButton = defineComponent({
  name: 'CmSplitButton',
  props: { label: String, menuLabel: String, items: { type: Array as PropType<MenuItem[]>, default: () => [] }, tone: String },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () => h(CmButtonGroup, { joined: true }, { default: () => [
      h(CmButton, { tone: props.tone, onClick: () => emit('click') }, { default: () => slots.default?.() ?? props.label }),
      h(CmDropdownMenu, { items: props.items }, {
        trigger: ({ triggerAttrs }: { triggerAttrs: Record<string, unknown> }) => h(CmButton, { ...triggerAttrs, variant: 'outline', 'aria-label': props.menuLabel ?? 'Mais opções' }, { default: () => '⌄' }),
      }),
    ] })
  },
})

export const CmPanel = component('CmPanel', (a, s) => {
  const { title, description, headingLevel, ...attrs } = a
  return h(CmCard, attrs, { ...s, header: () => h(CmSectionHeader, { title, description, headingLevel }, { actions: s.actions }) })
})
export const CmListPanel = component('CmListPanel', (a, s) => {
  const { title, description, filterLabel, ...attrs } = a
  return h(CmCard, attrs, {
    header: () => h(CmSectionHeader, { title, description }, { actions: s.actions }),
    default: () => h(CmStack, { gap: 'md' }, { default: () => [
      s.filters ? element('div', { class: 'cm-grid-container cm-grid-container--filters', role: 'group', 'aria-label': filterLabel }, s.filters()) : null,
      s.default?.(),
    ] }),
  })
})
export const CmTable = component('CmTable', (a, s) => {
  const { class: className, ...attrs } = a
  return element('div', { class: 'cm-table-scroll' }, element('table', { ...attrs, class: classes('cm-table', className) }, s.default?.()))
})
export const CmFilterBar = component('CmFilterBar', (a, s) => {
  return h(CmRow, { ...a, class: classes('cm-filter-bar', a.class), role: 'group', wrap: true, align: 'end' }, s)
})
export const CmToolbar = component('CmToolbar', (a, s) => {
  return h(CmRow, { ...a, class: classes('cm-toolbar', a.class), role: 'toolbar', wrap: true, align: 'center', justify: 'between' }, s)
})
export const CmSummaryList = component('CmSummaryList', (a, s) => {
  const { items = [], class: className, ...attrs } = a
  return element('dl', { ...attrs, class: classes('cm-summary-list', className) }, s.default?.() ?? items.map((item: { label: string; value: string }) =>
    element('div', { class: 'cm-summary-list__item' }, [
      element('dt', { class: 'cm-summary-list__label' }, item.label), element('dd', { class: 'cm-summary-list__value' }, item.value),
    ])))
})
export const CmTimeline = component('CmTimeline', (a, s) => {
  const { items = [], variant = 'default', class: className, ...attrs } = a
  return element('ol', { ...attrs, class: classes('cm-timeline', 'cm-timeline--' + variant, className) }, s.default?.() ?? items.map((item: { id?: string; label?: string; title?: string; description?: string; tone?: string }) =>
    element('li', { key: item.id, class: 'cm-timeline__item' }, [
      element('span', { class: 'cm-timeline__marker cm-timeline__marker--' + (item.tone ?? 'primary'), 'aria-hidden': true }, '•'),
      element('div', { class: 'cm-timeline__content' }, [
        element('small', { class: 'cm-timeline__label' }, item.label),
        element('strong', { class: 'cm-timeline__title' }, item.title),
        element('p', { class: 'cm-timeline__description' }, item.description),
      ]),
    ])))
})
export const CmSkeleton = component('CmSkeleton', (a) => {
  const { width, height, class: className, ...attrs } = a
  return element('div', { ...attrs, 'aria-hidden': true, class: classes('cm-skeleton', className), style: [{ width, height }, a.style] })
})

export const CmSlider = component('CmSlider', (a, s) => {
  const { label, name, modelValue, value, min = 0, max = 100, step = 1, 'onUpdate:modelValue': update, ...attrs } = a
  return element('label', { class: 'cm-slider' }, [
    label ? element('span', { class: 'cm-slider__label' }, label) : null,
    element('input', { ...attrs, name, type: 'range', min, max, step, value: modelValue ?? value ?? min,
      onInput: (event: Event) => update?.(Number((event.target as HTMLInputElement).value)) }),
    s.default?.(),
  ])
})
export const CmRadioGroup = defineComponent({
  name: 'CmRadioGroup',
  props: { name: String, label: String, modelValue: String, options: { type: Array as PropType<{ value: string; label: string; disabled?: boolean }[]>, default: () => [] } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const id = useId()
    return () => element('fieldset', { class: 'cm-radio-group' }, [
      props.label ? element('legend', { class: 'cm-field__label' }, props.label) : null,
      ...props.options.map(option => element('label', { key: option.value, class: 'cm-radio-group__option' }, [
        element('input', { type: 'radio', name: props.name ?? id, value: option.value, checked: props.modelValue === option.value,
          disabled: option.disabled, class: 'cm-radio-group__input', onChange: () => emit('update:modelValue', option.value) }),
        element('span', { class: 'cm-radio-group__label' }, option.label),
      ])),
    ])
  },
})

export const CmInputGroup = component('CmInputGroup', (a, s) => element('div', { class: classes('cm-input-group', a.class) }, [
  a.prefix || s.prefix ? element('span', { class: 'cm-input-group__addon' }, s.prefix?.() ?? a.prefix) : null,
  element('div', { class: 'cm-input-group__control' }, s.default?.()),
  a.suffix || s.suffix ? element('span', { class: 'cm-input-group__addon' }, s.suffix?.() ?? a.suffix) : null,
]))
export const CmFileUpload = defineComponent({
  name: 'CmFileUpload',
  props: { label: { type: String, default: 'Selecionar arquivo' }, accept: String, multiple: Boolean },
  emits: ['change'],
  setup(props, { emit }) {
    const files = ref<File[]>([])
    const id = useId()
    return () => h(CmField, { label: props.label, htmlFor: id, control: 'native' }, { default: () => [
      element('input', { id, type: 'file', accept: props.accept, multiple: props.multiple, class: 'cm-file-upload__input',
        onChange: (event: Event) => { files.value = [...((event.target as HTMLInputElement).files ?? [])]; emit('change', files.value) } }),
      ...files.value.map(file => element('p', { key: file.name, class: 'cm-file-upload__file-label' }, file.name)),
    ] })
  },
})
export const CmConfirmDialog = defineComponent({
  name: 'CmConfirmDialog',
  props: { open: Boolean, title: String, description: String, confirmLabel: String, cancelLabel: String },
  emits: ['close', 'confirm'],
  setup(props, { slots, emit }) {
    return () => h(CmDialog, { open: props.open, title: props.title, description: props.description, onClose: () => emit('close') }, {
      default: slots.default,
      footer: () => h(CmRow, { gap: 'sm', justify: 'end' }, { default: () => [
        h(CmButton, { variant: 'outline', onClick: () => emit('close') }, { default: () => props.cancelLabel ?? 'Cancelar' }),
        h(CmButton, { tone: 'primary', onClick: () => emit('confirm') }, { default: () => props.confirmLabel ?? 'Confirmar' }),
      ] }),
    })
  },
})
export const CmAspectRatio = component('CmAspectRatio', (a, s) => {
  const { ratio = 16 / 9, class: className, ...attrs } = a
  return element('div', { ...attrs, class: classes('cm-aspect-ratio', className), style: { aspectRatio: ratio, overflow: 'hidden' } }, s.default?.())
})
export const CmScrollArea = component('CmScrollArea', (a, s) => {
  const { maxHeight = '16rem', class: className, ...attrs } = a
  return element('div', { ...attrs, class: classes('cm-scroll-area', className), tabindex: a.tabindex ?? 0, style: { maxHeight, overflow: 'auto' } }, s.default?.())
})