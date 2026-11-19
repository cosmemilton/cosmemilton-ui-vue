import { computed, defineComponent, ref, type PropType } from 'vue'
import { classes, component, element } from './primitives.js'
import { cmThemes, type CmTheme } from './theme.js'

export const CmDataTableActions = component('CmDataTableActions', (attrs, slots) =>
  element('div', { ...attrs, class: classes('cm-data-table__actions', attrs.class) }, slots.default?.()))

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const dayFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' })
const isSameDay = (left: Date, right: Date) =>
  left.getDate() === right.getDate() && left.getMonth() === right.getMonth() && left.getFullYear() === right.getFullYear()

export const CmCalendar = defineComponent({
  name: 'CmCalendar',
  props: { value: Date, modelValue: Date, month: Number, year: Number },
  emits: { select: (value: Date) => value instanceof Date, 'update:modelValue': (value: Date) => value instanceof Date },
  setup(props, { emit }) {
    const today = new Date()
    const internal = ref(today)
    const selected = computed(() => props.modelValue ?? props.value ?? internal.value)
    const monthStart = computed(() => new Date(props.year ?? selected.value.getFullYear(), props.month ?? selected.value.getMonth(), 1))
    const calendarDates = computed(() => {
      const date = monthStart.value
      const startOffset = date.getDay()
      const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      const size = Math.ceil((startOffset + days) / 7) * 7
      return Array.from({ length: size }, (_, index) => {
        const day = index - startOffset + 1
        return day < 1 || day > days ? undefined : new Date(date.getFullYear(), date.getMonth(), day)
      })
    })
    function select(date: Date) {
      internal.value = date
      emit('select', date)
      emit('update:modelValue', date)
    }
    return () => element('div', { class: 'cm-calendar' }, [
      element('header', { class: 'cm-calendar__header' }, element('span', {}, monthFormat.format(monthStart.value))),
      element('div', { class: 'cm-calendar__weekdays', 'aria-hidden': true },
        weekdays.map(day => element('span', { class: 'cm-calendar__weekday', key: day }, day))),
      element('div', { class: 'cm-calendar__grid' }, calendarDates.value.map((date, index) => {
        if (!date) return element('span', { class: 'cm-calendar__empty', key: index, 'aria-hidden': true })
        const isToday = isSameDay(date, today)
        const isSelected = isSameDay(date, selected.value)
        return element('button', {
          type: 'button', key: date.getTime(), class: classes('cm-calendar__day',
            isToday && 'cm-calendar__day--today', isSelected ? 'cm-calendar__day--selected' : 'cm-calendar__day--default'),
          'aria-label': dayFormat.format(date), 'aria-current': isToday ? 'date' : undefined,
          'aria-pressed': isSelected, onClick: () => select(date),
        }, date.getDate())
      })),
    ])
  },
})

const densities = ['default', 'comfortable', 'compact']
const encodeScriptValue = (value: unknown) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,
  char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'))

export const CmThemeScript = defineComponent({
  name: 'CmThemeScript',
  props: {
    id: { type: String, default: 'cm-theme-script' }, defaultThemeName: String, defaultDensity: String,
    skin: { type: String, default: 'classic' }, nonce: String,
    storageKey: { type: [String, Boolean] as PropType<string | false>, default: 'cm-vue-theme' },
  },
  setup(props) {
    return () => {
      const themes: CmTheme['name'][] = cmThemes.map(theme => theme.name)
      const defaultTheme = themes.find(name => name === props.defaultThemeName) ?? themes[0]
      const defaultDensity = densities.find(density => density === props.defaultDensity) ?? 'default'
      const script = [
        '(()=>{const root=document.documentElement;',
        'let theme=' + encodeScriptValue(defaultTheme) + ',density=' + encodeScriptValue(defaultDensity) + ';',
        'const key=' + encodeScriptValue(props.storageKey) + ';',
        'if(key){try{const storedTheme=localStorage.getItem(key);',
        'const storedDensity=localStorage.getItem(key+"-density");',
        'if(' + encodeScriptValue(themes) + '.includes(storedTheme))theme=storedTheme;',
        'if(' + encodeScriptValue(densities) + '.includes(storedDensity))density=storedDensity;}catch{}}',
        'root.dataset.theme=theme;root.dataset.density=density;',
        'root.setAttribute("data-cm-skin",' + encodeScriptValue(props.skin) + ');})();',
      ].join('')
      return element('script', { id: props.id, nonce: props.nonce, innerHTML: script })
    }
  },
})