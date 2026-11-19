import { computed, defineComponent, h, inject, onMounted, onUnmounted, provide, ref, watch, type InjectionKey, type PropType, type Ref } from 'vue'
import { CmButton } from './forms.js'
import { CmDropdownMenu } from './feedback.js'
import { classes, element } from './primitives.js'

export const cmThemes = [
  { name: 'cm-v4-aurora', label: 'Aurora', colorScheme: 'light' },
  { name: 'cm-v4-light', label: 'Claro', colorScheme: 'light' },
  { name: 'cm-v4-dark', label: 'Escuro', colorScheme: 'dark' },
] as const
export type CmTheme = (typeof cmThemes)[number]
type ThemeContext = { theme: Ref<CmTheme>; themes: readonly CmTheme[]; setThemeByName: (name: string) => void }
const themeKey: InjectionKey<ThemeContext> = Symbol.for('@cosmemilton/ui-vue/theme')
const find = (name?: string | null) => cmThemes.find(theme => theme.name === name)
const defaultTheme = cmThemes[0]

export const CmThemeProvider = defineComponent({
  name: 'CmThemeProvider',
  props: {
    defaultThemeName: String,
    themeName: String,
    skin: { type: String, default: 'classic' },
    storageKey: { type: [String, Boolean] as PropType<string | false>, default: 'cm-vue-theme' },
    scoped: Boolean,
  },
  emits: ['update:themeName'],
  setup(props, { slots, emit }) {
    const own = ref(find(props.defaultThemeName) ?? defaultTheme)
    const theme = computed(() => find(props.themeName) ?? own.value)
    const ready = ref(false)
    let oldTheme: string | null = null
    let oldSkin: string | null = null
    function setThemeByName(name: string) {
      const next = find(name)
      if (!next) return
      own.value = next
      emit('update:themeName', next.name)
    }
    provide(themeKey, { theme, themes: cmThemes, setThemeByName })
    onMounted(() => {
      oldTheme = document.documentElement.getAttribute('data-theme')
      oldSkin = document.documentElement.getAttribute('data-cm-skin')
      if (props.storageKey) {
        try { own.value = find(localStorage.getItem(props.storageKey)) ?? own.value } catch {}
      }
      ready.value = true
    })
    watch([theme, () => props.skin, ready], () => {
      if (!ready.value) return
      if (!props.scoped) {
        document.documentElement.setAttribute('data-theme', theme.value.name)
        document.documentElement.setAttribute('data-cm-skin', props.skin)
      }
      if (props.storageKey) {
        try { localStorage.setItem(props.storageKey, theme.value.name) } catch {}
      }
    })
    onUnmounted(() => {
      if (!ready.value || props.scoped) return
      if (oldTheme) document.documentElement.setAttribute('data-theme', oldTheme)
      else document.documentElement.removeAttribute('data-theme')
      if (oldSkin) document.documentElement.setAttribute('data-cm-skin', oldSkin)
      else document.documentElement.removeAttribute('data-cm-skin')
    })
    return () => props.scoped ? element('div', { class: 'cm-theme-scope', 'data-theme': theme.value.name,
      'data-cm-skin': props.skin }, slots.default?.()) : slots.default?.()
  },
})

export const CmThemeScope = defineComponent({
  name: 'CmThemeScope',
  props: { themeName: String, skin: String },
  setup(props, { slots, attrs }) {
    const parent = inject(themeKey)
    const theme = computed(() => find(props.themeName) ?? parent?.theme.value ?? defaultTheme)
    provide(themeKey, { theme, themes: cmThemes, setThemeByName: parent?.setThemeByName ?? (() => {}) })
    return () => element('div', { ...attrs, class: classes('cm-theme-scope', attrs.class),
      'data-theme': theme.value.name, 'data-cm-skin': props.skin }, slots.default?.())
  },
})

export function useCmTheme() {
  const context = inject(themeKey)
  if (!context) throw new Error('CmThemeProvider é necessário para trocar o tema.')
  return context
}

export const CmThemeToggle = defineComponent({
  name: 'CmThemeToggle',
  props: { presentation: { type: String, default: 'compact' }, labelVisibility: String },
  setup(props, { attrs }) {
    const { theme, themes, setThemeByName } = useCmTheme()
    return () => props.presentation === 'compact'
      ? h(CmDropdownMenu, {
        items: themes.map(option => ({ id: option.name, label: option.label,
          shortcut: option.name === theme.value.name ? 'Atual' : undefined,
          onSelect: () => setThemeByName(option.name) })),
      }, {
        trigger: ({ triggerAttrs }: { triggerAttrs: Record<string, unknown> }) => h(CmButton, {
          ...attrs, ...triggerAttrs, variant: 'ghost', size: 'sm', shape: 'pill',
          'aria-label': 'Selecionar tema: ' + theme.value.label,
        }, { default: () => props.labelVisibility === 'hidden' ? '◐' : theme.value.label + ' ⌄' }),
      })
      : element('div', { class: 'cm-theme-toggle' }, themes.map(option => h(CmButton, {
        variant: option.name === theme.value.name ? 'surface' : 'ghost', 'aria-current': option.name === theme.value.name,
        onClick: () => setThemeByName(option.name),
      }, { default: () => option.label })))
  },
})
export const CmThemeMenu = defineComponent({
  name: 'CmThemeMenu',
  setup(_, { attrs }) { return () => h(CmThemeToggle, { ...attrs, presentation: 'compact' }) },
})