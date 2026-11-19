import { computed, defineComponent, h, onMounted, onUnmounted, ref, useId, type Component, type PropType, type VNodeChild } from 'vue'
import { classes, element } from './primitives.js'

export type MegaMenuItem = { id: string; label: string; description?: string; href?: string; icon?: VNodeChild; keywords?: string[]; disabled?: boolean }
export type MegaMenuGroup = { id: string; label: string; items: MegaMenuItem[] }

function normalize(text: string) {
  return text.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

export const CmMegaMenuSearch = defineComponent({
  name: 'CmMegaMenuSearch',
  props: {
    groups: { type: Array as PropType<MegaMenuGroup[]>, required: true },
    modelValue: String, query: String, placeholder: { type: String, default: 'Buscar páginas' },
    keyboardShortcut: String, maxResults: { type: Number, default: 8 }, disabled: Boolean,
    emptyMessage: { type: String, default: 'Nenhuma página encontrada.' },
    linkComponent: [Object, Function],
  },
  emits: ['update:modelValue','update:query','select'],
  setup(props, { emit, attrs, slots }) {
    const ownQuery = ref('')
    const focused = ref(false)
    const current = ref(-1)
    const control = ref<HTMLInputElement>()
    const root = ref<HTMLElement>()
    const id = useId()
    const value = computed(() => props.modelValue ?? props.query ?? ownQuery.value)
    const matches = computed(() => {
      const terms = normalize(value.value).split(/\s+/).filter(Boolean)
      if (!terms.length) return []
      return props.groups.flatMap(group => group.items.map(item => {
        const normalizedLabel = normalize(item.label)
        const text = normalize([item.label, item.description, ...(item.keywords ?? [])].filter(Boolean).join(' '))
        return { item, text, labelMatch: terms.every(term => normalizedLabel.includes(term)) }
      }))
        .filter(match => terms.every(term => match.text.includes(term)))
        .sort((left, right) => Number(right.labelMatch) - Number(left.labelMatch))
        .slice(0, props.maxResults)
    })
    const visible = computed(() => focused.value && value.value.trim().length > 0 && !props.disabled)
    function update(query: string) {
      ownQuery.value = query; current.value = -1
      emit('update:modelValue', query); emit('update:query', query)
    }
    function close() { focused.value = false; current.value = -1 }
    function select(item?: MegaMenuItem, event?: MouseEvent | KeyboardEvent) {
      if (!item || item.disabled) return
      emit('select', item, event)
      if (event instanceof KeyboardEvent && item.href && !event.defaultPrevented) window.location.assign(item.href)
      close()
    }
    function keys(event: KeyboardEvent) {
      if (event.key === 'Escape') { close(); return }
      if (event.key === 'Enter' && visible.value && current.value >= 0) {
        select(matches.value[current.value]?.item, event); event.preventDefault(); return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const enabled = matches.value.map((match, index) => match.item.disabled ? -1 : index).filter(index => index >= 0)
      if (!enabled.length) return
      event.preventDefault()
      focused.value = true
      const position = enabled.indexOf(current.value)
      const step = event.key === 'ArrowDown' ? 1 : -1
      const next = position < 0 ? (step === 1 ? 0 : enabled.length - 1) : (position + step + enabled.length) % enabled.length
      current.value = enabled[next] ?? -1
    }
    function shortcut(event: KeyboardEvent) {
      if (props.disabled || !props.keyboardShortcut || !(event.ctrlKey || event.metaKey) ||
          event.key.toLowerCase() !== props.keyboardShortcut.toLowerCase()) return
      event.preventDefault(); control.value?.focus()
    }
    onMounted(() => window.addEventListener('keydown', shortcut))
    onUnmounted(() => { if (typeof window !== 'undefined') window.removeEventListener('keydown', shortcut) })
    return () => element('div', { ref: root, class: classes('cm-mega-search', attrs.class),
      onFocusout: (event: FocusEvent) => { if (event.relatedTarget instanceof Node && !root.value?.contains(event.relatedTarget)) close() } }, [
      slots.icon ? element('span', { class: 'cm-mega-search__icon', 'aria-hidden': true }, slots.icon()) : null,
      element('input', { ref: control, class: 'cm-mega-search__input', role: 'combobox', type: 'search',
        value: value.value, placeholder: props.placeholder, disabled: props.disabled, autocomplete: 'off',
        'aria-label': attrs['aria-label'] ?? props.placeholder, 'aria-autocomplete': 'list', 'aria-expanded': visible.value,
        'aria-controls': visible.value ? id : undefined, 'aria-activedescendant': current.value >= 0 ? id + '-' + current.value : undefined,
        onFocus: () => { focused.value = true }, onInput: (event: Event) => { focused.value = true; update((event.target as HTMLInputElement).value) },
        onKeydown: keys,
      }),
      props.keyboardShortcut ? element('kbd', { class: 'cm-mega-search__shortcut', 'aria-hidden': true }, 'Ctrl ' + props.keyboardShortcut.toUpperCase()) : null,
      visible.value ? element('div', { class: 'cm-mega-panel cm-mega-search__panel', role: 'listbox', id, 'data-positioned': 'true',
        'aria-label': 'Resultados da busca', style: { position: 'absolute', zIndex: 700, top: 'calc(100% + .5rem)', right: 0,
          width: 'min(90vw, 32rem)', overflow: 'auto', maxHeight: '55vh', padding: '.45rem', borderRadius: 'var(--radius-lg)',
          color: 'var(--color-popover-foreground)', background: 'var(--color-popover)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' },
      }, matches.value.length ? matches.value.map(({ item }, index) => {
        const target = props.linkComponent as Component | undefined
        const bindings = {
          key: item.id, id: id + '-' + index, class: classes('cm-mega-panel__item', current.value === index && 'cm-mega-search__result--active'),
          role: 'option', tabindex: -1, 'aria-selected': current.value === index, 'aria-disabled': item.disabled || undefined,
          onPointerenter: () => { if (!item.disabled) current.value = index },
          onMousedown: (event: MouseEvent) => { event.preventDefault() },
          onClick: (event: MouseEvent) => select(item, event),
        }
        const children = [
          item.icon ? element('span', { class: 'cm-mega-panel__icon', 'aria-hidden': true }, item.icon) : null,
          element('span', { class: 'cm-mega-panel__item-copy' }, [
            element('span', { class: 'cm-mega-panel__label' }, item.label),
            item.description ? element('span', { class: 'cm-mega-panel__description' }, item.description) : null,
          ]),
        ]
        if (target && item.href && !item.disabled) return h(target, { ...bindings, to: item.href }, { default: () => children })
        if (item.href && !item.disabled) return element('a', { ...bindings, href: item.href }, children)
        return element('button', { ...bindings, type: 'button', disabled: item.disabled }, children)
      }) : element('div', { class: 'cm-mega-search__empty', role: 'option', 'aria-selected': false, 'aria-disabled': true }, props.emptyMessage)) : null,
    ])
  },
})