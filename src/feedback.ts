import { Teleport, defineComponent, h, inject, nextTick, onMounted, onUnmounted, provide, ref, useId, watch, type InjectionKey, type VNodeChild } from 'vue'
import { barThicknessPixels, classes, component, element } from './primitives.js'

export type ToastOptions = { title?: string; tone?: 'default' | 'info' | 'success' | 'warning' | 'danger'; duration?: number }
type ToastItem = ToastOptions & { id: number; message: string }
type ToastApi = { toast: (message: string, options?: ToastOptions) => void }
const toastKey: InjectionKey<ToastApi> = Symbol.for('@cosmemilton/ui-vue/toast')

export const CmToastProvider = defineComponent({
  name: 'CmToastProvider',
  props: { position: { type: String, default: 'bottom-right' } },
  setup(props, { slots }) {
    const items = ref<ToastItem[]>([])
    const timers = new Map<number, ReturnType<typeof setTimeout>>()
    let sequence = 0
    const remove = (id: number) => {
      clearTimeout(timers.get(id))
      timers.delete(id)
      items.value = items.value.filter(item => item.id !== id)
    }
    function toast(message: string, options: ToastOptions = {}) {
      const existing = items.value.find(item => item.message === message && item.tone === options.tone)
      if (existing) remove(existing.id)
      const id = ++sequence
      items.value = [...items.value, { ...options, id, message }]
      timers.set(id, setTimeout(() => remove(id), options.duration ?? 4000))
    }
    provide(toastKey, { toast })
    onUnmounted(() => timers.forEach(timer => clearTimeout(timer)))
    return () => [
      slots.default?.(),
      items.value.length ? h(Teleport, { to: 'body' }, [element('div', {
        class: 'cm-toast__viewport cm-toast__viewport--' + props.position, 'data-position': props.position,
      }, items.value.map(item => element('div', {
        key: item.id, role: 'status',
        class: 'cm-toast__item cm-toast__item--visible cm-toast__item--' + (item.tone ?? 'default'),
      }, [
        element('span', { class: 'cm-toast__content' }, [
          item.title ? element('strong', { class: 'cm-toast__title' }, item.title) : null,
          element('span', { class: 'cm-toast__message' }, item.message),
        ]),
        element('button', { type: 'button', class: 'cm-toast__close', 'aria-label': 'Fechar', onClick: () => remove(item.id) }, '×'),
      ])))]) : null,
    ]
  },
})

export function useCmToast(): ToastApi
export function useCmToast(options: { optional: true }): ToastApi | undefined
export function useCmToast(options?: { optional: true }) {
  const value = inject(toastKey, undefined)
  if (!value && !options?.optional) throw new Error('CmToastProvider é necessário para usar os toasts.')
  return value
}

export const CmToastNotice = defineComponent({
  name: 'CmToastNotice',
  props: { title: String, description: String, tone: String },
  setup(props) {
    const { toast } = useCmToast()
    watch(() => props.description, message => {
      if (message) toast(message, { title: props.title, tone: props.tone as ToastOptions['tone'] })
    }, { immediate: true })
    return () => null
  },
})

export type MenuItem = {
  id: string
  label: string
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  icon?: VNodeChild
  onSelect?: () => void
}

export const CmDropdownMenu = defineComponent({
  name: 'CmDropdownMenu',
  inheritAttrs: false,
  props: { items: { type: Array as () => MenuItem[], required: true }, align: { type: String, default: 'end' }, panelClass: String },
  setup(props, { attrs, slots }) {
    const open = ref(false)
    const container = ref<HTMLElement>()
    const menu = ref<HTMLElement>()
    const panel = ref<HTMLElement>()
    const panelStyle = { opacity: 0, pointerEvents: 'none' }
    const themeScope = ref<Record<string, string | undefined>>({})
    let needsFocus = false
    const id = useId()
    const buttons = () => [...(menu.value?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)') ?? [])]
    const trigger = () => container.value?.querySelector<HTMLElement>('[aria-haspopup="menu"]')
    function hide(focus = false) {
      needsFocus = false
      open.value = false
      if (focus) trigger()?.focus({ preventScroll: true })
    }
    function toggle() {
      if (open.value) hide()
      else {
        const scope = trigger()?.closest<HTMLElement>('.cm-theme-scope')
        themeScope.value = scope ? {
          'data-theme': scope.dataset.theme, 'data-density': scope.dataset.density, 'data-cm-skin': scope.dataset.cmSkin,
        } : {}
        needsFocus = true
        open.value = true
      }
    }
    function updatePosition() {
      const anchor = trigger()?.getBoundingClientRect()
      const floating = panel.value
      if (!anchor || !floating) return
      const margin = 8
      const gap = 8
      const width = document.documentElement.clientWidth
      const height = document.documentElement.clientHeight
      const below = height - anchor.bottom - margin - gap
      const above = anchor.top - margin - gap
      const upward = floating.scrollHeight > below && above > below
      const panelWidth = floating.offsetWidth
      const start = anchor.left
      const end = anchor.right - panelWidth
      const preferred = props.align === 'start' ? start : props.align === 'center' ? (start + end) / 2 : end
      const opposite = props.align === 'start' ? end : start
      const limit = width - panelWidth - margin
      const overflow = (left: number) => Math.max(0, margin - left) + Math.max(0, left - limit)
      const left = props.align !== 'center' && overflow(opposite) < overflow(preferred) ? opposite : preferred
      Object.assign(floating.style, {
        left: Math.max(margin, Math.min(left, limit)) + 'px',
        top: upward ? 'auto' : anchor.bottom + gap + 'px',
        bottom: upward ? height - anchor.top + gap + 'px' : 'auto',
        maxHeight: Math.max(0, upward ? above : below) + 'px',
        opacity: '1',
        pointerEvents: 'auto',
      })
      if (needsFocus) {
        needsFocus = false
        if (open.value) (buttons()[0] ?? menu.value)?.focus({ preventScroll: true })
      }
    }
    watch(open, (visible, _, cleanup) => {
      if (!visible) return
      void nextTick(updatePosition)
      const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updatePosition)
      const anchor = trigger()
      if (anchor) observer?.observe(anchor)
      if (menu.value) observer?.observe(menu.value)
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
      cleanup(() => {
        observer?.disconnect()
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      })
    }, { flush: 'post' })
    function navigate(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); hide(true); return }
      if (event.key === 'Tab') { hide(true); return }
      const items = buttons()
      if (!items.length) return
      const current = items.indexOf(document.activeElement as HTMLButtonElement)
      const next = ({ Home: 0, End: items.length - 1, ArrowDown: (current + 1) % items.length,
        ArrowUp: current <= 0 ? items.length - 1 : current - 1 } as Record<string, number>)[event.key]
      if (next !== undefined) { event.preventDefault(); items[next]?.focus() }
    }
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !container.value?.contains(event.target) && !panel.value?.contains(event.target)) hide()
    }
    onMounted(() => document.addEventListener('pointerdown', outside))
    onUnmounted(() => { if (typeof document !== 'undefined') document.removeEventListener('pointerdown', outside) })
    return () => [
      element('span', { ...attrs, class: classes('cm-vue-menu', attrs.class), ref: container }, slots.trigger?.({
        open: open.value, toggle, triggerAttrs: {
          'aria-haspopup': 'menu', 'aria-expanded': open.value, 'aria-controls': open.value ? id : undefined,
          onClick: toggle, onKeydown: (event: KeyboardEvent) => {
            if (!open.value && !event.defaultPrevented && event.key === 'ArrowDown') { event.preventDefault(); toggle() }
          },
        },
      })),
      open.value ? h(Teleport, { to: 'body' }, element('div', {
        ...themeScope.value, ref: panel, style: panelStyle,
        class: classes('cm-popover__panel cm-dropdown-menu__popover cm-vue-dropdown-panel', props.panelClass,
          themeScope.value['data-theme'] && 'cm-theme-scope'),
      }, element('div', { ref: menu, id, role: 'menu', tabindex: -1, class: 'cm-dropdown-menu', onKeydown: navigate }, [
        slots.header?.(),
        ...props.items.map(item => element('button', { type: 'button', key: item.id, role: 'menuitem', tabindex: -1,
          disabled: item.disabled,
          class: classes('cm-dropdown-menu__item', item.danger ? 'cm-dropdown-menu__item--danger' : 'cm-dropdown-menu__item--default'),
          onClick: () => { hide(true); item.onSelect?.() },
        }, [
          element('span', { class: 'cm-dropdown-menu__label' }, [item.icon, item.label]),
          item.shortcut ? element('span', { class: 'cm-dropdown-menu__shortcut' }, item.shortcut) : null,
        ])),
      ]))) : null,
    ]
  },
})

export const CmDialog = defineComponent({
  name: 'CmDialog',
  props: {
    open: Boolean,
    title: String,
    description: String,
    size: { type: String, default: 'md' },
    tone: { type: String, default: 'primary' },
  },
  emits: ['close', 'update:open'],
  setup(props, { slots, emit }) {
    const dialog = ref<HTMLElement>()
    const titleId = useId()
    const descriptionId = useId()
    let previous: HTMLElement | undefined
    let wasOverflow = ''
    const close = () => { emit('update:open', false); emit('close') }
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); close(); return }
      if (event.key !== 'Tab' || !dialog.value) return
      const focusable = [...dialog.value.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),textarea,select,[tabindex="0"]')]
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    function restore() {
      if (typeof document === 'undefined' || !previous) return
      document.body.style.overflow = wasOverflow
      previous.focus({ preventScroll: true })
      previous = undefined
    }
    watch(() => props.open, async isOpen => {
      if (typeof document === 'undefined') return
      if (!isOpen) { restore(); return }
      previous = document.activeElement instanceof HTMLElement ? document.activeElement : document.body
      wasOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      await nextTick()
      const first = dialog.value?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea')
      ;(first ?? dialog.value)?.focus()
    }, { immediate: true })
    onUnmounted(restore)
    return () => props.open ? h(Teleport, { to: 'body' }, [element('div', { class: 'cm-dialog-portal-scope' }, [
      element('div', { class: 'cm-dialog__overlay cm-dialog__overlay--open', 'aria-hidden': true, onClick: close }),
      element('div', {
        ref: dialog, role: 'dialog', tabindex: -1, 'aria-modal': true, 'aria-labelledby': props.title ? titleId : undefined,
        'aria-describedby': props.description ? descriptionId : undefined, onKeydown: keydown,
        class: 'cm-dialog__positioner cm-dialog__positioner--open cm-dialog__positioner--' + props.size,
      }, element('div', { class: 'cm-dialog__panel', 'data-tone': props.tone }, [
        element('div', { class: 'cm-dialog__tone-bar' }),
        element('header', { class: 'cm-dialog__header' }, [
          element('button', { type: 'button', class: 'cm-dialog__close cm-dialog__close--header', 'aria-label': 'Fechar', onClick: close }, '×'),
          element('div', { class: 'cm-dialog__heading' }, element('h2', { id: titleId, class: 'cm-dialog__title' }, props.title)),
        ]),
        element('div', { class: 'cm-dialog__body' }, [
          props.description ? element('p', { id: descriptionId, class: 'cm-dialog__description' }, props.description) : null,
          slots.default?.(),
        ]),
        slots.footer ? element('footer', { class: 'cm-dialog__footer' }, slots.footer()) : null,
      ])),
    ])]) : null
  },
})

export const CmProgress = component('CmProgress', (a) => {
  const { label, value = 0, min = 0, max = 100, tone, showValue, srOnlyLabel, barThickness, valueFormat, class: className, 'aria-label': ariaLabel, ...attrs } = a
  const span = max - min
  const nativeValue = Math.min(Math.max(value - min, 0), Math.max(0, span))
  const fraction = span > 0 ? nativeValue / span : 0
  const percent = Math.round(fraction * 100)
  const visibleLabel = label && (srOnlyLabel === undefined || srOnlyLabel === false)
  const visibleValue = showValue !== undefined && showValue !== false
  return element('div', { ...attrs, class: classes('cm-progress', tone === 'inherit' && 'cm-progress--inherit', className) }, [
    visibleLabel || visibleValue ? element('div', { class: 'cm-progress__header', 'aria-hidden': true }, [
      visibleLabel ? element('span', { class: 'cm-progress__label' }, label) : null,
      visibleValue ? element('span', { class: 'cm-progress__value' }, valueFormat ? valueFormat({ value, min, max, fraction, percent }) : percent + '%') : null,
    ]) : null,
    element('progress', { class: 'cm-progress__bar', value: nativeValue, max: span > 0 ? span : 1, 'aria-label': label || ariaLabel || 'Progresso',
      style: { height: barThicknessPixels(barThickness) } }),
  ])
})
