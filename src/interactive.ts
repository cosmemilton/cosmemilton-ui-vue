import { Teleport, computed, defineComponent, h, nextTick, ref, useId, watch, type PropType } from 'vue'
import { CmButton, CmField, CmInput } from './forms.js'
import { CmCard, CmRow, CmStack, classes, element } from './primitives.js'

type Option = { label: string; value: string; disabled?: boolean }

export const CmCombobox = defineComponent({
  name: 'CmCombobox',
  props: { label: String, placeholder: String, modelValue: String, value: String,
    options: { type: Array as PropType<Option[]>, default: () => [] }, disabled: Boolean },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit, attrs }) {
    const id = useId()
    const draft = ref('')
    watch(() => props.modelValue ?? props.value, value => {
      draft.value = props.options.find(option => option.value === value)?.label ?? value ?? ''
    }, { immediate: true })
    function choose(value: string) {
      draft.value = value
      const match = props.options.find(option => !option.disabled && (option.label === value || option.value === value))
      if (match || value === '') {
        emit('update:modelValue', match?.value ?? '')
        emit('change', match?.value ?? '')
      }
    }
    return () => element('div', { class: 'cm-combobox' }, [
      h(CmInput, { ...attrs, id, list: id + '-options', label: props.label, placeholder: props.placeholder, disabled: props.disabled,
        modelValue: draft.value, 'onUpdate:modelValue': choose }),
      element('datalist', { id: id + '-options' }, props.options.filter(option => !option.disabled)
        .map(option => element('option', { key: option.value, value: option.label }))),
    ])
  },
})

function multiSelect(name: string) {
  return defineComponent({
    name,
    props: {
      label: String, modelValue: Array as PropType<string[]>, value: Array as PropType<string[]>,
      options: { type: Array as PropType<Option[]>, default: () => [] }, disabled: Boolean,
    },
    emits: ['update:modelValue', 'change'],
    setup(props, { emit, attrs }) {
      const id = useId()
      const selected = computed(() => props.modelValue ?? props.value ?? [])
      return () => h(CmField, { label: props.label, htmlFor: id, control: 'native' }, { default: () =>
        element('select', { ...attrs, id, multiple: true, disabled: props.disabled, size: Math.min(6, Math.max(3, props.options.length)),
          class: 'cm-vue-multiple-select',
          onChange: (event: Event) => {
            const value = [...(event.target as HTMLSelectElement).selectedOptions].map(option => option.value)
            emit('update:modelValue', value); emit('change', value)
          },
        }, props.options.map(option => element('option', { key: option.value, value: option.value,
          selected: selected.value.includes(option.value), disabled: option.disabled }, option.label))),
      })
    },
  })
}
export const CmComboboxMulti = multiSelect('CmComboboxMulti')
export const CmMultiSelect = multiSelect('CmMultiSelect')

export const CmCarousel = defineComponent({
  name: 'CmCarousel',
  props: { label: String, items: Array as PropType<{ title?: string; description?: string; image?: string; src?: string }[]> },
  setup(props, { slots }) {
    const index = ref(0)
    return () => {
      const nodes = props.items?.map((item, key) => h(CmCard, { key }, {
        default: () => [
          item.image || item.src ? element('img', { src: item.image ?? item.src, alt: item.title ?? '' }) : null,
          item.title ? element('h3', {}, item.title) : null, item.description ? element('p', {}, item.description) : null,
        ],
      })) ?? slots.default?.() ?? []
      function navigate(delta: number) {
        if (nodes.length) index.value = (index.value + delta + nodes.length) % nodes.length
      }
      return element('section', { class: 'cm-carousel', 'aria-label': props.label ?? 'Carrossel',
        onKeydown: (event: KeyboardEvent) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); navigate(event.key === 'ArrowLeft' ? -1 : 1) }
        },
      }, [
        element('div', { class: 'cm-carousel__viewport' }, nodes[index.value]),
        nodes.length ? h(CmRow, { justify: 'between', align: 'center', gap: 'sm' }, { default: () => [
          h(CmButton, { variant: 'outline', 'aria-label': 'Anterior', disabled: nodes.length < 2, onClick: () => navigate(-1) }, { default: () => '‹' }),
          element('span', { 'aria-live': 'polite' }, index.value + 1 + ' / ' + nodes.length),
          h(CmButton, { variant: 'outline', 'aria-label': 'Próximo', disabled: nodes.length < 2, onClick: () => navigate(1) }, { default: () => '›' }),
        ] }) : null,
      ])
    }
  },
})

export const CmDrawer = defineComponent({
  name: 'CmDrawer',
  props: { open: Boolean, title: String, side: { type: String, default: 'right' } },
  emits: ['update:open','close'],
  setup(props, { emit, slots }) {
    const panel = ref<HTMLElement>()
    let trigger: HTMLElement | null = null
    function close() { emit('update:open', false); emit('close') }
    watch(() => props.open, async visible => {
      if (typeof document === 'undefined') return
      if (!visible) { trigger?.focus(); return }
      trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await nextTick()
      panel.value?.focus()
    }, { immediate: true })
    return () => props.open ? h(Teleport, { to: 'body' }, [element('div', { class: 'cm-drawer__portal-scope' }, [
      element('div', { class: 'cm-drawer__overlay', role: 'presentation', onClick: close }),
      element('aside', { class: 'cm-drawer__panel cm-drawer__panel--' + props.side, ref: panel,
        role: 'dialog', 'aria-modal': true, 'aria-label': props.title ?? 'Painel lateral', tabindex: -1,
        onKeydown: (event: KeyboardEvent) => {
          if (event.key === 'Escape') { event.preventDefault(); close() }
          const controls = [...(panel.value?.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href], select, textarea') ?? [])]
          if (event.key === 'Tab' && controls.length) {
            if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
            if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus() }
          }
        },
      }, [
        element('header', { class: 'cm-drawer__header' }, [
          element('h2', { class: 'cm-drawer__title' }, props.title),
          element('button', { type: 'button', class: 'cm-drawer__close', onClick: close }, 'Fechar'),
        ]),
        element('div', { class: 'cm-drawer__body' }, slots.default?.()),
      ]),
    ])]) : null
  },
})

export const CmRichTextEditor = defineComponent({
  name: 'CmRichTextEditor',
  props: { label: { type: String, default: 'Editor de texto' }, modelValue: String },
  emits: ['update:modelValue','change'],
  setup(props, { emit }) {
    const initial = props.modelValue
    const editor = ref<HTMLElement>()
    function change() { const text = editor.value?.innerText ?? ''; emit('update:modelValue', text); emit('change', text) }
    function format(command: string) {
      editor.value?.focus()
      document.execCommand(command)
      change()
    }
    return () => element('section', { class: 'cm-rich-text-editor', 'aria-label': props.label }, [
      h(CmRow, { gap: 'xs', role: 'toolbar' }, { default: () => [
        ...[['bold','Negrito'],['italic','Itálico'],['insertUnorderedList','Lista']].map(([command, label]) =>
          h(CmButton, { size: 'sm', variant: 'outline', onMousedown: (event: Event) => event.preventDefault(), onClick: () => format(command) }, { default: () => label })),
      ] }),
      element('div', { ref: editor, contenteditable: 'true', role: 'textbox', 'aria-multiline': true,
        'aria-label': props.label, class: 'cm-rich-text-editor__content', onInput: change,
        style: { minHeight: '6rem', padding: 'var(--space-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' },
      }, initial),
    ])
  },
})

export const CmSignaturePad = defineComponent({
  name: 'CmSignaturePad', props: { label: String, width: { type: Number, default: 420 }, height: { type: Number, default: 140 } },
  emits: ['change'],
  setup(props, { emit }) {
    const canvas = ref<HTMLCanvasElement>()
    let drawing = false
    function pointer(event: PointerEvent, start: boolean) {
      const node = canvas.value
      const context = node?.getContext('2d')
      if (!node || !context || (!drawing && !start)) return
      const rect = node.getBoundingClientRect()
      const x = (event.clientX - rect.left) * node.width / rect.width
      const y = (event.clientY - rect.top) * node.height / rect.height
      if (start) {
        node.setPointerCapture(event.pointerId)
        drawing = true
        context.strokeStyle = getComputedStyle(node).color
        context.lineWidth = 2
        context.lineCap = 'round'
        context.beginPath()
        context.moveTo(x, y)
      } else {
        context.lineTo(x, y)
        context.stroke()
      }
    }
    function end() { if (drawing) { drawing = false; emit('change', canvas.value?.toDataURL()) } }
    function clear() {
      const node = canvas.value
      node?.getContext('2d')?.clearRect(0, 0, props.width, props.height)
      emit('change', null)
    }
    return () => h(CmStack, { class: 'cm-signature-pad', gap: 'sm' }, { default: () => [
      element('canvas', { ref: canvas, width: props.width, height: props.height, 'aria-label': props.label ?? 'Área de assinatura',
        onPointerdown: (event: PointerEvent) => pointer(event, true), onPointermove: (event: PointerEvent) => pointer(event, false),
        onPointerup: end, onPointercancel: end,
        style: { touchAction: 'none', width: '100%', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' },
      }),
      h(CmButton, { variant: 'outline', size: 'sm', onClick: clear }, { default: () => 'Limpar assinatura' }),
    ] })
  },
})