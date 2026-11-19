import { defineComponent, h, nextTick, onMounted, onUnmounted, ref, useId, watch, type Component, type VNodeChild } from 'vue'
import { CmText, classes, component, element } from './primitives.js'

export const CmAuthLayout = defineComponent({
  name: 'CmAuthLayout',
  props: {
    layout: { type: String, default: 'centered' },
    appearance: { type: String, default: 'plain' },
    title: { type: String, required: true },
    description: String,
    eyebrow: String,
    brand: String,
    backgroundImage: String,
    artworkImage: String,
  },
  setup(props, { slots }) {
    const titleId = useId()
    return () => {
      const split = props.layout === 'split'
      const header = props.brand || slots.actions ? element('header', {
        class: 'cm-row cm-layout-wrap cm-auth__header', 'data-align': 'center', 'data-justify': 'between',
        style: { '--cm-layout-gap': 'var(--space-md)' },
      }, [
        props.brand ? element('div', { class: 'cm-row cm-auth__brand', 'data-align': 'center', style: { '--cm-layout-gap': 'var(--space-sm)' } }, [
          slots.brandIcon ? element('span', { class: 'cm-row cm-auth__brand-mark', 'aria-hidden': true }, slots.brandIcon()) : null,
          h(CmText, { as: 'span', size: 'lg', weight: 'extrabold', family: 'heading', tracking: 'tight', spacing: 'none' }, { default: () => props.brand }),
        ]) : null,
        slots.actions?.(),
      ]) : null
      return element('div', {
        class: classes('cm-stack', 'cm-auth', 'cm-auth--' + props.layout, 'cm-auth--' + props.appearance,
          props.backgroundImage && 'cm-auth--with-background'),
        style: {
          '--cm-auth-background-image': props.backgroundImage ? 'url(' + JSON.stringify(props.backgroundImage) + ')' : undefined,
          '--cm-auth-artwork-image': props.artworkImage ? 'url(' + JSON.stringify(props.artworkImage) + ')' : undefined,
        },
      }, [
        element('div', { class: 'cm-stack cm-auth__workspace' }, [
          split ? null : header,
          element('main', { class: 'cm-stack cm-auth__content', 'aria-labelledby': titleId }, [
            element('div', { class: 'cm-stack cm-auth__panel', style: { '--cm-layout-gap': 'var(--space-xl)' } }, [
              split ? header : null,
              element('div', { class: 'cm-stack', style: { '--cm-layout-gap': 'var(--space-sm)' } }, [
                slots.icon ? element('span', { class: 'cm-row cm-auth__title-icon', 'aria-hidden': true }, slots.icon()) : null,
                props.eyebrow ? element('span', { class: 'cm-auth__eyebrow cm-text cm-text--xs cm-text--bold cm-text--spacing-none' }, props.eyebrow) : null,
                element('h1', { id: titleId, class: 'cm-text cm-text--md cm-text--extrabold cm-text--family-heading cm-text--spacing-none cm-auth__title' }, props.title),
                props.description ? element('p', { class: 'cm-text cm-text--md cm-text--muted cm-text--spacing-none' }, props.description) : null,
              ]),
              slots.default?.(),
              slots.footer ? element('footer', { class: 'cm-stack cm-auth__footer', style: { '--cm-layout-gap': 'var(--space-sm)' } }, slots.footer()) : null,
            ]),
          ]),
        ]),
        split ? element('div', { class: 'cm-stack cm-auth__illustration', 'aria-hidden': true }) : null,
      ])
    }
  },
})

export type ShellControls = { closeMobileSidebar: () => void; openMobileSidebar: () => void; mobileSidebarOpen: boolean }

export const CmAppShell = defineComponent({
  name: 'CmAppShell',
  props: { contentKey: String, skipLinkLabel: String },
  setup(props, { slots }) {
    const open = ref(false)
    const content = ref<HTMLElement>()
    const menuButton = ref<HTMLButtonElement>()
    const panel = ref<HTMLElement>()
    const mainId = useId()
    const drawerId = useId()
    let media: MediaQueryList | undefined
    const isMobile = ref(false)
    const close = () => { open.value = false }
    const openMenu = () => { open.value = true }
    function updateMobile() {
      isMobile.value = Boolean(media?.matches)
      if (!isMobile.value) close()
    }
    function keydown(event: KeyboardEvent) {
      if (!open.value || !isMobile.value) return
      if (event.key === 'Escape') {
        close()
        menuButton.value?.focus()
      }
      if (event.key !== 'Tab' || !panel.value) return
      const enabled = [...panel.value.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),[tabindex="0"]')]
      const first = enabled[0]
      const last = enabled.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    onMounted(() => {
      media = window.matchMedia('(max-width: 860px)')
      media.addEventListener('change', updateMobile)
      updateMobile()
      window.addEventListener('keydown', keydown)
    })
    onUnmounted(() => {
      media?.removeEventListener('change', updateMobile)
      if (typeof window !== 'undefined') window.removeEventListener('keydown', keydown)
    })
    watch(() => props.contentKey, () => { content.value?.scrollTo({ top: 0 }); close() })
    watch(open, async value => { if (value) { await nextTick(); panel.value?.querySelector<HTMLElement>('button')?.focus() } })
    return () => {
      const modal = open.value && isMobile.value
      const controls: ShellControls = { closeMobileSidebar: close, openMobileSidebar: openMenu, mobileSidebarOpen: open.value }
      return element('div', {
        class: classes('cm-app-shell cm-app-shell--chrome-surface cm-app-shell--backdrop-plain',
          open.value && 'cm-app-shell--mobile-open', !slots.sidebar && 'cm-app-shell--no-sidebar'),
        style: { '--cm-app-shell-content-padding': '0px' },
      }, [
        props.skipLinkLabel ? element('a', { href: '#' + mainId, class: 'cm-app-shell__skip-link', onClick: (event: Event) => {
          event.preventDefault(); content.value?.focus()
        } }, props.skipLinkLabel) : null,
        slots.sidebar ? element('aside', { class: 'cm-app-shell__sidebar', inert: modal }, slots.sidebar(controls)) : null,
        slots.sidebar ? element('div', { class: 'cm-app-shell__mobile-layer', 'aria-hidden': !modal, inert: !modal }, [
          element('button', { type: 'button', class: 'cm-app-shell__mobile-backdrop', 'aria-label': 'Fechar menu', onClick: close }),
          element('aside', {
            class: 'cm-app-shell__mobile-drawer', ref: panel, id: drawerId, role: 'dialog', 'aria-modal': modal || undefined,
            'aria-label': 'Menu', tabindex: -1,
          }, [
            element('button', { type: 'button', class: 'cm-app-shell__mobile-close', 'aria-label': 'Fechar menu', onClick: close }, '×'),
            slots.sidebar(controls),
          ]),
        ]) : null,
        element('div', { class: 'cm-app-shell__main', inert: modal }, [
          element('div', { class: 'cm-app-shell__topbar' }, slots.topbar?.({
            ...controls, mobileMenuButton: element('button', {
              type: 'button', ref: menuButton, class: 'cm-app-shell__mobile-menu-button', 'aria-label': 'Abrir menu',
              'aria-expanded': open.value, 'aria-controls': drawerId, onClick: openMenu,
            }, '☰'),
          })),
          element('main', { class: 'cm-app-shell__content', ref: content, id: mainId, tabindex: -1 }, slots.default?.()),
        ]),
      ])
    }
  },
})

export type SidebarItem = { id: string; label: string; to: string; icon?: Component; active?: boolean }
export type SidebarGroup = { id: string; label: string; icon?: Component; direct?: boolean; items: SidebarItem[] }

export const CmSidebar = defineComponent({
  name: 'CmSidebar',
  props: {
    groups: { type: Array as () => SidebarGroup[], required: true },
    activePathname: { type: String, required: true },
    navLabel: { type: String, default: 'Navegação principal' },
    brand: { type: String, default: 'Menu' },
    linkComponent: [Object, Function],
    forceOpen: Boolean,
    width: [Number, String],
    minHeight: [Number, String],
    rail: { type: String, default: 'connectors' },
  },
  emits: ['navigate'],
  setup(props, { slots, emit }) {
    const collapsed = ref(false)
    const preview = ref(false)
    const pinButton = ref<HTMLButtonElement>()
    let closeTimer: ReturnType<typeof setTimeout> | undefined
    function clearCloseTimer() { clearTimeout(closeTimer); closeTimer = undefined }
    function openPreview() {
      if (!collapsed.value || props.forceOpen) return
      clearCloseTimer()
      preview.value = true
    }
    function closePreview(delay = 700) {
      if (!preview.value) return
      clearCloseTimer()
      closeTimer = setTimeout(() => { preview.value = false; closeTimer = undefined }, delay)
    }
    function togglePinned() {
      const pinning = collapsed.value
      collapsed.value = !pinning
      clearCloseTimer()
      preview.value = false
      if (pinning) nextTick(() => pinButton.value?.focus({ preventScroll: true }))
    }
    watch(() => props.forceOpen, () => { clearCloseTimer(); preview.value = false })
    onUnmounted(clearCloseTimer)
    const openGroup = ref<string | null>(null)
    const navigation = ref<HTMLElement>()
    const active = (item: SidebarItem) => item.active ?? props.activePathname === item.to
    watch(() => props.activePathname, () => {
      openGroup.value = props.groups.find(group => group.items.some(active))?.id ?? null
    }, { immediate: true })
    watch([() => props.activePathname, navigation], async (_, __, onCleanup) => {
      const link = navigation.value?.querySelector<HTMLElement>('.cm-sidebar__group-items > .cm-sidebar__item[aria-current="page"]')
      const list = link?.parentElement
      if (!link || !list || list.inert) return
      const initialScroll = list.scrollTop
      let cancelled = false
      onCleanup(() => { cancelled = true })

      const opening = list.getAnimations?.().filter(animation =>
        'transitionProperty' in animation && animation.transitionProperty === 'max-height') ?? []
      if (opening.length) await Promise.allSettled(opening.map(animation => animation.finished))
      if (cancelled || list.inert || !link.isConnected || initialScroll !== list.scrollTop || !list.clientHeight) return

      const bounds = list.getBoundingClientRect()
      const item = link.getBoundingClientRect()
      const top = bounds.top + list.clientTop
      const bottom = top + list.clientHeight
      if (item.top < top) list.scrollTop += item.top - top
      else if (item.bottom > bottom) list.scrollTop += item.bottom - bottom
    }, { flush: 'post' })
    const icon = (component: Component | undefined, label: string, marker = false) => element('span', {
      class: classes('cm-sidebar__nav-icon', !component && (marker ? 'cm-sidebar__nav-icon--marker' : 'cm-sidebar__nav-icon--fallback')),
      'aria-hidden': true,
    }, component ? h(component, { size: 18 }) : marker ? null : label.trim().slice(0, 1).toUpperCase())
    const chevron = (direction: 'left' | 'right', className?: string) => element('svg', {
      class: className, width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': true,
    }, element('path', { d: direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6' }))
    const link = (item: SidebarItem, itemIcon?: Component, marker = true) => {
      const Node = props.linkComponent as Component | undefined
      const bindings = {
        class: classes('cm-sidebar__item', active(item) && 'cm-sidebar__item--active'),
        'aria-current': active(item) ? 'page' : undefined, title: item.label,
        onClick: () => { closePreview(1300); emit('navigate') },
      }
      const children: VNodeChild[] = [icon(itemIcon ?? item.icon, item.label, marker), element('span', { class: 'cm-sidebar__label' }, item.label)]
      return Node ? h(Node, { ...bindings, to: item.to }, { default: () => children })
        : element('a', { ...bindings, href: item.to }, children)
    }
    return () => {
      const compact = collapsed.value && !props.forceOpen
      return element('div', { class: classes('cm-sidebar-shell cm-sidebar-shell--standalone cm-sidebar-shell--tone-surface',
        compact && 'cm-sidebar-shell--collapsed', compact && preview.value && 'cm-sidebar-shell--preview'), style: {
        '--cm-sidebar-expanded-width': typeof props.width === 'number' ? `${props.width}px` : props.width,
        '--cm-sidebar-min-height': typeof props.minHeight === 'number' ? `${props.minHeight}px` : props.minHeight,
      } }, [
        element('aside', { class: classes('cm-sidebar cm-sidebar--tone-surface', props.rail !== 'connectors' && 'cm-sidebar--rail-' + props.rail),
          'aria-label': props.navLabel, onMouseenter: openPreview, onMouseleave: () => closePreview(), onFocusin: openPreview,
          onFocusout: (event: FocusEvent) => {
            if (!(event.relatedTarget instanceof Node) || !(event.currentTarget as HTMLElement).contains(event.relatedTarget)) closePreview()
          },
        }, [
          element('div', { class: 'cm-sidebar__brand' }, [
            compact ? element('button', { class: 'cm-sidebar__brand-icon-button', type: 'button', 'aria-label': 'Abrir menu lateral',
              'aria-expanded': preview.value, onClick: togglePinned }, element('span', { class: 'cm-sidebar__brand-icon' }, slots.brandIcon?.() ?? props.brand[0]))
              : element('span', { class: 'cm-sidebar__brand-icon', 'aria-hidden': true }, slots.brandIcon?.() ?? props.brand[0]),
            element('div', { class: 'cm-sidebar__brand-text' }, element('strong', { title: props.brand }, props.brand)),
            (!compact || preview.value) && !props.forceOpen ? element('button', {
              type: 'button', ref: pinButton, class: 'cm-sidebar__toggle', 'aria-label': compact ? 'Expandir menu lateral' : 'Recolher menu lateral',
              onClick: togglePinned,
            }, chevron(compact ? 'right' : 'left')) : null,
          ]),
          element('nav', { class: 'cm-sidebar__nav', 'aria-label': props.navLabel, ref: navigation }, props.groups.map(group => {
            const isActive = group.items.some(active)
            const groupOpen = openGroup.value === group.id && !group.direct
            const expanded = groupOpen && (!compact || preview.value)
            return element('div', { key: group.id, class: classes('cm-sidebar__group',
              isActive && 'cm-sidebar__group--active', groupOpen && 'cm-sidebar__group--open') },
            group.direct ? link(group.items[0], group.icon, false) : [
              element('button', {
                type: 'button', class: classes('cm-sidebar__group-trigger', isActive && 'cm-sidebar__group-trigger--active'),
                'aria-expanded': expanded, title: group.label,
                onClick: () => {
                  openPreview()
                  openGroup.value = groupOpen ? null : group.id
                },
              }, [icon(group.icon, group.label), element('span', { class: 'cm-sidebar__label' }, group.label),
                chevron('right', 'cm-sidebar__chevron')]),
              element('div', { class: 'cm-sidebar__group-items', 'aria-hidden': !expanded, inert: !expanded },
                group.items.map(item => link(item))),
            ])
          })),
          slots.footer ? element('div', { class: 'cm-sidebar__footer' }, slots.footer()) : null,
        ]),
      ])
    }
  },
})

export const CmTopbar = component('CmTopbar', (a, s) => element('header', {
  class: classes('cm-topbar cm-topbar--tone-surface cm-topbar--layout-search cm-topbar--mobile-inline', a.class),
}, ['start', 'center', 'end'].map(region =>
  s[region] ? element('div', { class: 'cm-topbar__section cm-topbar__section--' + region }, s[region]()) : null)))
