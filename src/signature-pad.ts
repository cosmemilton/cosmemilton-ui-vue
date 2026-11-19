import { defineComponent, onMounted, onUnmounted, ref, watch } from 'vue'
import { classes, element } from './primitives.js'

type Point = { x: number; y: number }
type Stroke = Point[]
const strokeWidth = 2.25

export const CmSignaturePad = defineComponent({
  name: 'CmSignaturePad',
  props: {
    label: String,
    ariaLabel: String,
    clearLabel: { type: String, default: 'Limpar' },
    placeholder: { type: String, default: 'Assine aqui' },
    width: { type: Number, default: 420 },
    height: { type: [Number, String], default: 140 },
    disabled: Boolean,
  },
  emits: { change: (_value: string | null) => true },
  setup(props, { emit }) {
    const frame = ref<HTMLDivElement>()
    const canvas = ref<HTMLCanvasElement>()
    const empty = ref(true)
    const status = ref('')
    const strokes: Stroke[] = []
    let active: { id: number; stroke: Stroke } | undefined
    let observer: ResizeObserver | undefined
    let width = 0
    let height = 0

    function paint(context: CanvasRenderingContext2D, stroke: Stroke) {
      const [first, ...points] = stroke
      if (!first) return
      context.beginPath()
      if (!points.length) {
        context.arc(first.x * width, first.y * height, strokeWidth / 2, 0, Math.PI * 2)
        context.fill()
        return
      }
      context.moveTo(first.x * width, first.y * height)
      for (const point of points) context.lineTo(point.x * width, point.y * height)
      context.stroke()
    }

    function redraw() {
      const node = canvas.value
      const context = node?.getContext('2d')
      if (!node || !context || !width || !height) return
      context.setTransform(node.width / width, 0, 0, node.height / height, 0, 0)
      context.fillStyle = '#fff'
      context.fillRect(0, 0, width, height)
      context.strokeStyle = context.fillStyle = getComputedStyle(node).color || '#111827'
      context.lineWidth = strokeWidth
      context.lineCap = context.lineJoin = 'round'
      for (const stroke of strokes) paint(context, stroke)
      if (active) paint(context, active.stroke)
    }

    function resize() {
      const node = canvas.value
      const size = frame.value
      if (!node || !size?.clientWidth || !size.clientHeight) return
      const { clientWidth, clientHeight } = size
      const minimumWidth = Number.isFinite(props.width) ? props.width : 420
      const ratio = Math.max(window.devicePixelRatio || 1, minimumWidth / clientWidth)
      const pixelWidth = Math.round(clientWidth * ratio)
      const pixelHeight = Math.round(clientHeight * ratio)
      if (width === clientWidth && height === clientHeight && node.width === pixelWidth && node.height === pixelHeight) return
      width = clientWidth
      height = clientHeight
      node.width = pixelWidth
      node.height = pixelHeight
      redraw()
    }

    onMounted(() => {
      resize()
      if (typeof ResizeObserver !== 'undefined' && frame.value) {
        observer = new ResizeObserver(resize)
        observer.observe(frame.value)
      }
      window.addEventListener('resize', resize)
    })
    onUnmounted(() => {
      observer?.disconnect()
      window.removeEventListener('resize', resize)
    })
    watch(() => [props.width, props.height], resize, { flush: 'post' })
    watch(() => props.disabled, disabled => { if (disabled) cancelStroke() })

    function pointAt(event: PointerEvent, node: HTMLCanvasElement): Point {
      const rect = node.getBoundingClientRect()
      return { x: (event.clientX - rect.left) / (rect.width || 1), y: (event.clientY - rect.top) / (rect.height || 1) }
    }

    function start(event: PointerEvent) {
      const node = canvas.value
      const context = node?.getContext('2d')
      if (!node || !context || props.disabled || active || event.button !== 0) return
      event.preventDefault()
      resize()
      node.setPointerCapture(event.pointerId)
      active = { id: event.pointerId, stroke: [pointAt(event, node)] }
      empty.value = false
      paint(context, active.stroke)
    }

    function move(event: PointerEvent) {
      const node = canvas.value
      const context = node?.getContext('2d')
      if (!node || !context || props.disabled || active?.id !== event.pointerId) return
      const point = pointAt(event, node)
      const last = active.stroke[active.stroke.length - 1]
      if (last.x === point.x && last.y === point.y) return
      active.stroke.push(point)
      paint(context, [last, point])
    }

    function stopCapture(id: number) {
      const node = canvas.value
      if (node?.hasPointerCapture(id)) node.releasePointerCapture(id)
    }

    function discardActive() {
      const id = active?.id
      active = undefined
      if (id !== undefined) stopCapture(id)
    }

    function cancelStroke() {
      if (!active) return
      discardActive()
      empty.value = strokes.length === 0
      redraw()
    }

    function finish(event: PointerEvent) {
      if (active?.id !== event.pointerId) return
      if (props.disabled) { cancelStroke(); return }
      if (event.type === 'pointerup') move(event)
      const { stroke } = active
      discardActive()
      strokes.push(stroke)
      const node = canvas.value
      if (node) {
        status.value = 'Assinatura registrada.'
        emit('change', node.toDataURL('image/png'))
      }
    }

    function clear() {
      discardActive()
      strokes.length = 0
      empty.value = true
      status.value = 'Assinatura removida.'
      redraw()
      emit('change', null)
    }

    return () => {
      const label = props.ariaLabel ?? props.label ?? 'Área de assinatura'
      const frameHeight = typeof props.height === 'number' ? `${props.height}px` : props.height
      return element('div', { class: 'cm-signature-pad' }, [
        element('div', { ref: frame, class: classes('cm-signature-pad__frame', props.disabled && 'cm-signature-pad__frame--disabled'),
          style: { height: frameHeight } }, [
          element('canvas', { ref: canvas, class: 'cm-signature-pad__canvas', role: 'img',
            'aria-label': empty.value ? `${label} (vazia)` : label, 'aria-disabled': props.disabled || undefined,
            onPointerdown: start, onPointermove: move, onPointerup: finish, onPointercancel: finish, onLostpointercapture: finish,
          }),
          empty.value ? element('span', { class: 'cm-signature-pad__placeholder', 'aria-hidden': true }, props.placeholder) : null,
        ]),
        element('div', { class: 'cm-signature-pad__footer' }, [
          element('span', { class: 'cm-sr-only', role: 'status', 'aria-live': 'polite' }, status.value),
          element('button', { type: 'button', class: 'cm-signature-pad__clear', disabled: props.disabled || empty.value, onClick: clear }, [
            element('svg', { class: 'cm-signature-pad__clear-icon', 'aria-hidden': true, viewBox: '0 0 24 24', fill: 'none',
              stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
              element('path', { d: 'M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21' }),
              element('path', { d: 'm5.082 11.09 8.828 8.828' }),
            ]),
            props.clearLabel,
          ]),
        ]),
      ])
    }
  },
})
