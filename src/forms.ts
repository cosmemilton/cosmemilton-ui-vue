import { defineComponent, h, ref, useId } from 'vue'
import { classes, component, element, normalizeAttrs, spacing } from './primitives.js'

export const CmButton = component('CmButton', (a, s) => {
  const { as = 'button', type = 'button', variant = 'solid', tone = 'default', size = 'md', shape = 'default',
    fullWidth, iconOnly, loading, loadingLabel, unstyled, disabled, class: className, ...attrs } = a
  const isIconOnly = iconOnly !== undefined && iconOnly !== false
  const buttonClass = unstyled !== undefined && unstyled !== false ? className : classes('cm-button',
    'cm-button--' + variant, 'cm-button--tone-' + tone, 'cm-button--shape-' + shape,
    'cm-button--' + (isIconOnly ? 'icon-' : '') + size,
    fullWidth !== undefined && fullWidth !== false && 'cm-button--full-width', className)
  return element(as, { ...attrs, class: buttonClass, type: as === 'button' ? type : undefined,
    disabled: as === 'button' && (disabled === '' || disabled || loading), 'aria-busy': loading || undefined }, [
    loading ? element('span', { class: 'cm-button__icon cm-button__spinner', 'aria-hidden': true }, '◌')
      : s.icon ? element('span', { class: 'cm-button__icon' }, s.icon()) : null,
    isIconOnly ? element('span', { class: 'cm-sr-only' }, attrs['aria-label'] ?? loadingLabel ?? s.default?.())
      : loading && loadingLabel ? loadingLabel : s.default?.(),
    !isIconOnly && s.trailingIcon ? element('span', { class: 'cm-button__icon cm-button__icon--trailing' }, s.trailingIcon()) : null,
  ])
})

export const CmField = component('CmField', (a, s) => {
  const { label, htmlFor, required, description, error, layout = 'vertical', control, class: className, ...attrs } = a
  return element('div', {
    ...attrs, class: classes('cm-field', 'cm-field--' + layout, control === 'native' && 'cm-field--native', className),
  }, [
    label ? element('div', { class: 'cm-field__header' }, element('div', { class: 'cm-field__label-row' },
      element(htmlFor ? 'label' : 'div', { class: 'cm-field__label', for: htmlFor }, [
        label, required ? element('span', { class: 'cm-field__required' }, '*') : null,
      ]))) : null,
    element('div', { class: 'cm-field__body' }, s.default?.()),
    description ? element('p', { class: 'cm-field__description' }, description) : null,
    error ? element('p', { class: 'cm-field__error' }, error) : null,
  ])
})

export const CmLabel = component('CmLabel', (a, s) => {
  const { optional, class: className, ...attrs } = a
  return element('label', { ...attrs, class: classes('cm-label', className) }, [
    element('span', { class: 'cm-label__text' }, s.default?.()),
    optional ? element('span', { class: 'cm-label__optional' }, 'Opcional') : null,
  ])
})

function nativeControl(name: string, tag: 'input' | 'select' | 'textarea') {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { attrs: given, slots, expose }) {
      const generatedId = useId()
      let input: HTMLElement | null = null
      expose({ focus: () => input?.focus(), select: () => (input as HTMLInputElement | null)?.select?.() })
      return () => {
        const { label, modelValue, value, options = [], id = generatedId, description, type, onInput, onChange,
          'onUpdate:modelValue': update, ...attrs } = normalizeAttrs(given)
        const control = h(tag, {
          ...attrs, id, type: tag === 'input' ? (type ?? 'text') : undefined, ...(modelValue !== undefined || value !== undefined ? { value: modelValue ?? value } : {}),
          ref: (node: unknown) => { input = node instanceof HTMLElement ? node : null },
          onInput: (event: Event) => {
            if (tag !== 'select') update?.((event.target as HTMLInputElement).value)
            onInput?.(event)
          },
          onChange: (event: Event) => {
            if (tag === 'select') update?.((event.target as HTMLSelectElement).value)
            onChange?.(event)
          },
        }, tag === 'select' ? [
          ...options.map((option: { value: string | number; label: string; disabled?: boolean }) =>
            element('option', { key: option.value, value: option.value, disabled: option.disabled }, option.label)),
          ...(slots.default?.() ?? []),
        ] : undefined)
        return h(CmField, { label, htmlFor: id, control: 'native', required: attrs.required, description },
          { default: () => control })
      }
    },
  })
}

export const CmNativeInput = nativeControl('CmNativeInput', 'input')
export const CmNativeSelect = nativeControl('CmNativeSelect', 'select')
export const CmSelect = nativeControl('CmSelect', 'select')
export const CmTextarea = nativeControl('CmTextarea', 'textarea')

export const CmInput = defineComponent({
  name: 'CmInput',
  inheritAttrs: false,
  setup(_, { attrs: given, slots, expose }) {
    const generatedId = useId()
    let input: HTMLInputElement | null = null
    const focused = ref(false)
    const hasUncontrolledValue = ref(false)
    expose({ focus: () => input?.focus(), select: () => input?.select() })
    return () => {
      const { label, modelValue, value, id = generatedId, class: className, helperText, error, density, onInput, onFocus, onBlur,
        'onUpdate:modelValue': update, ...attrs } = normalizeAttrs(given)
      const controlValue = modelValue ?? value
      const filled = controlValue === undefined ? hasUncontrolledValue.value : controlValue !== ''
      return element('div', { class: classes('cm-floating-field', !label && 'cm-floating-field--unlabeled',
        density && density !== 'default' && 'cm-density-' + density, className) }, [
        element('div', { class: classes('cm-floating-field__control', error && 'cm-floating-field--error') }, [
          slots.startIcon ? element('span', { class: 'cm-floating-field__adornment', 'aria-hidden': true }, slots.startIcon()) : null,
          element('div', { class: 'cm-floating-field__input-wrap' }, h('input', {
            ...attrs, id, class: 'cm-input__control', type: attrs.type ?? 'text', ...(controlValue !== undefined ? { value: controlValue } : {}),
            'aria-describedby': helperText ? id + '-hint' : attrs['aria-describedby'],
            'aria-invalid': error ? true : attrs['aria-invalid'],
            ref: (node: unknown) => { input = node instanceof HTMLInputElement ? node : null },
            onFocus: (event: FocusEvent) => { focused.value = true; onFocus?.(event) },
            onBlur: (event: FocusEvent) => { focused.value = false; onBlur?.(event) },
            onInput: (event: Event) => {
              const value = (event.target as HTMLInputElement).value
              hasUncontrolledValue.value = value.length > 0
              update?.(value)
              onInput?.(event)
            },
          })),
          label ? element('label', { for: id, class: classes('cm-floating-field__label',
            filled || focused.value ? 'cm-floating-field__label--floating' : 'cm-floating-field__label--resting',
            focused.value && 'cm-floating-field__label--focused') }, label) : null,
          slots.endButton ? element('span', { class: 'cm-floating-field__adornment cm-floating-field__adornment--flush' }, slots.endButton()) : null,
        ]),
        helperText ? element('p', { id: id + '-hint', class: 'cm-floating-field__message cm-floating-field__message--static' }, helperText) : null,
      ])
    }
  },
})

export const CmCheckbox = component('CmCheckbox', (a, s) => {
  const { class: className, label, modelValue, checked, onChange, 'onUpdate:modelValue': update, ...attrs } = a
  return element('label', { class: classes('cm-checkbox', className) }, [
    h('input', {
      ...attrs, type: 'checkbox', class: 'cm-checkbox__input', checked: modelValue ?? checked,
      onChange: (event: Event) => { update?.((event.target as HTMLInputElement).checked); onChange?.(event) },
    }),
    element('span', { class: 'cm-checkbox__indicator', 'aria-hidden': true }),
    element('span', { class: 'cm-checkbox__label' }, s.default?.() ?? label),
  ])
})

export const CmSwitch = component('CmSwitch', (a, s) => {
  const { class: className, label, modelValue, checked, onChange, 'onUpdate:modelValue': update, ...attrs } = a
  return element('label', { class: classes('cm-switch', className) }, [
    h('input', {
      ...attrs, type: 'checkbox', role: 'switch', class: 'cm-switch__input', checked: modelValue ?? checked,
      onChange: (event: Event) => { update?.((event.target as HTMLInputElement).checked); onChange?.(event) },
    }),
    element('span', { class: 'cm-switch__track', 'aria-hidden': true },
      element('span', { class: 'cm-switch__thumb' })),
    element('span', { class: 'cm-switch__label' }, s.default?.() ?? label),
  ])
})

export const CmForm = component('CmForm', (a, s) => {
  const { title, description, surface = 'card', layout = 'stack', gap = 'lg', actionsAlign = 'end', class: className, style, ...attrs } = a
  return element('form', {
    ...attrs, class: classes('cm-form', surface === 'plain' && 'cm-form--plain',
      'cm-form--layout-' + layout, 'cm-form--actions-' + actionsAlign, className),
    style: [{ '--cm-form-gap': spacing(gap) }, style],
  }, [
    title || description ? element('header', { class: 'cm-form__header' }, [
      title ? element('h2', { class: 'cm-form__title' }, title) : null,
      description ? element('p', { class: 'cm-form__description' }, description) : null,
    ]) : null,
    element('div', { class: 'cm-form__body' }, s.default?.()),
    s.actions ? element('footer', { class: 'cm-form__actions' }, s.actions()) : null,
  ])
})

export const CmFormActions = component('CmFormActions', (a) => {
  const { cancelLabel = 'Cancelar', submitLabel = 'Salvar', onCancel, formId, loading, disabled } = a
  return element('div', { class: 'cm-form-actions' }, [
    onCancel ? h(CmButton, { variant: 'outline', onClick: onCancel }, { default: () => cancelLabel }) : null,
    h(CmButton, { type: 'submit', tone: 'primary', form: formId, loading, disabled }, { default: () => submitLabel }),
  ])
})