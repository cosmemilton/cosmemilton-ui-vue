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
  },
  emits: ['navigate'],
  setup(props, { slots, emit }) {
    const collapsed = ref(false)
    const openGroup = ref<string | null>(null)
    const active = (item: SidebarItem) => item.active ?? props.activePathname === item.to
    watch(() => props.activePathname, () => {
      openGroup.value = props.groups.find(group => group.items.some(active))?.id ?? null
    }, { immediate: true })
    const icon = (component?: Component) => component
      ? element('span', { class: 'cm-sidebar__icon', 'aria-hidden': true }, h(component, { size: 18 }))
      : null
    const link = (item: SidebarItem, itemIcon?: Component) => {
      const Node = props.linkComponent as Component | undefined
      const bindings = {
        class: classes('cm-sidebar__item', active(item) && 'cm-sidebar__item--active'),
        'aria-current': active(item) ? 'page' : undefined, title: item.label,
        onClick: () => emit('navigate'),
      }
      const children: VNodeChild[] = [icon(itemIcon ?? item.icon), element('span', { class: 'cm-sidebar__label' }, item.label)]
      return Node ? h(Node, { ...bindings, to: item.to }, { default: () => children })
        : element('a', { ...bindings, href: item.to }, children)
    }
    return () => {
      const compact = collapsed.value && !props.forceOpen
      return element('div', { class: classes('cm-sidebar-shell cm-sidebar-shell--standalone cm-sidebar-shell--tone-surface',
        compact && 'cm-sidebar-shell--collapsed') }, [
        element('aside', { class: 'cm-sidebar cm-sidebar--tone-surface', 'aria-label': props.navLabel }, [
          element('div', { class: 'cm-sidebar__brand' }, [
            compact ? element('button', { class: 'cm-sidebar__brand-icon-button', type: 'button', 'aria-label': 'Expandir menu lateral',
              onClick: () => { collapsed.value = false } }, element('span', { class: 'cm-sidebar__brand-icon' }, slots.brandIcon?.() ?? props.brand[0]))
              : element('span', { class: 'cm-sidebar__brand-icon', 'aria-hidden': true }, slots.brandIcon?.() ?? props.brand[0]),
            element('div', { class: 'cm-sidebar__brand-text' }, element('strong', { title: props.brand }, props.brand)),
            !compact && !props.forceOpen ? element('button', {
              type: 'button', class: 'cm-sidebar__toggle', 'aria-label': 'Recolher menu lateral',
              onClick: () => { collapsed.value = true },
            }, '‹') : null,
          ]),
          element('nav', { class: 'cm-sidebar__nav', 'aria-label': props.navLabel }, props.groups.map(group => {
            const isActive = group.items.some(active)
            const expanded = openGroup.value === group.id && !compact
            return element('div', { key: group.id, class: classes('cm-sidebar__group',
              isActive && 'cm-sidebar__group--active', expanded && 'cm-sidebar__group--open') },
            group.direct ? link(group.items[0], group.icon) : [
              element('button', {
                type: 'button', class: classes('cm-sidebar__group-trigger', isActive && 'cm-sidebar__group-trigger--active'),
                'aria-expanded': expanded, title: group.label,
                onClick: () => {
                  if (compact) collapsed.value = false
                  openGroup.value = expanded ? null : group.id
                },
              }, [icon(group.icon), element('span', { class: 'cm-sidebar__label' }, group.label),
                element('span', { class: 'cm-sidebar__chevron', 'aria-hidden': true }, '›')]),
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