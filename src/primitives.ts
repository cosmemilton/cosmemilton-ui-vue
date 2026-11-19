import { defineComponent, h, type Slots, type VNodeChild } from 'vue'

export type Attributes = Record<string, any>

export function classes(...values: unknown[]) {
  return values.filter(Boolean) as string[]
}

export function barThicknessPixels(value?: number | string) {
  const pixels = typeof value === 'number' ? value : ({ xs: 4, sm: 8, md: 12, lg: 16 } as Record<string, number>)[value ?? '']
  return pixels && Number.isFinite(pixels) && pixels > 0 ? pixels + 'px' : undefined
}

export function spacing(value: unknown, fallback = 'var(--space-lg)') {
  if (typeof value === 'number') return value + 'px'
  if (typeof value !== 'string') return fallback
  return /^(none|xs|sm|md|lg|xl|2xl|3xl)$/.test(value) ? 'var(--space-' + value + ')' : value
}

export function normalizeAttrs(attrs: Readonly<Attributes>): Attributes {
  return Object.fromEntries(Object.entries(attrs).map(([key, value]) => [
    /^(data-|aria-)/.test(key) ? key : key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
    value,
  ]))
}

export function component(name: string, render: (attrs: Attributes, slots: Slots) => VNodeChild) {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      return () => render(normalizeAttrs(attrs), slots)
    },
  })
}

export function element(tag: string, attrs: Attributes = {}, children?: VNodeChild) {
  return h(tag, attrs, children == null ? [] : Array.isArray(children) ? children : [children])
}

export function slotValue(slots: Slots, attrs: Attributes, name: string) {
  return slots[name]?.() ?? attrs[name]
}

function layout(name: string, kind: 'row' | 'stack' | 'col') {
  return component(name, (a, s) => {
    const {
      as = 'div', class: className, style, gap, align = kind === 'row' ? 'center' : 'stretch', justify = 'start',
      wrap, fullWidth, grow, padding, paddingInline, paddingBlock, margin, marginInline, surface, radius, border,
      width, minWidth, maxWidth, height, minHeight, maxHeight, overflow, top, position, ...attrs
    } = a
    const box = padding !== undefined || paddingInline !== undefined || paddingBlock !== undefined ||
      margin !== undefined || marginInline !== undefined
    return element(as, {
      ...attrs, 'data-align': align, 'data-justify': justify,
      class: classes('cm-' + kind, wrap !== undefined && wrap !== false && 'cm-layout-wrap',
        fullWidth !== undefined && fullWidth !== false && 'cm-layout-full',
        grow !== undefined && grow !== false && 'cm-layout-grow',
        box && 'cm-layout-box', (margin !== undefined || marginInline !== undefined) && 'cm-layout-box--has-margin',
        surface && 'cm-layout-surface-' + surface, radius && 'cm-layout-radius-' + radius,
        border && 'cm-layout-border-' + border, className),
      style: [{
        '--cm-layout-gap': spacing(gap), '--cm-layout-grow': typeof grow === 'number' ? grow : undefined,
        '--cm-layout-padding': padding === undefined ? undefined : spacing(padding),
        '--cm-layout-padding-inline': paddingInline === undefined ? undefined : spacing(paddingInline),
        '--cm-layout-padding-block': paddingBlock === undefined ? undefined : spacing(paddingBlock),
        '--cm-layout-margin': margin === undefined ? undefined : spacing(margin),
        '--cm-layout-margin-inline': marginInline === undefined ? undefined : spacing(marginInline),
        width: typeof width === 'number' ? width + 'px' : width,
        minWidth: typeof minWidth === 'number' ? minWidth + 'px' : minWidth,
        maxWidth, height, minHeight, maxHeight, overflow, top, position,
      }, style],
    }, s.default?.())
  })
}

export const CmStack = layout('CmStack', 'stack')
export const CmRow = layout('CmRow', 'row')
export const CmCol = layout('CmCol', 'col')
export const CmBox = layout('CmBox', 'stack')

export const CmText = component('CmText', (a, s) => {
  const { as = a.inline !== undefined && a.inline !== false ? 'span' : 'p', size = 'sm', tone = 'default', weight = 'normal', spacing: textSpacing,
    family = 'sans', tracking = 'normal', wrap = 'normal', whiteSpace = 'normal', align, inline, truncate, class: className, ...attrs } = a
  return element(as, {
    ...attrs,
    class: classes('cm-text', 'cm-text--' + size, 'cm-text--' + tone, weight && 'cm-text--' + weight,
      textSpacing && textSpacing !== 'none' && 'cm-text--spacing-' + textSpacing, 'cm-text--family-' + family,
      'cm-text--tracking-' + tracking, 'cm-text--wrap-' + wrap, 'cm-text--white-space-' + whiteSpace,
      align && 'cm-text--align-' + align, truncate && 'cm-text--truncate', className),
  }, s.default?.())
})

export const CmContainer = component('CmContainer', (a, s) => {
  const { as = 'div', padding, paddingInline, paddingBlock, maxWidth, class: className, style, fluid, ...attrs } = a
  return element(as, { ...attrs, class: classes('cm-container', className),
    style: [{ '--cm-container-max': fluid ? '100%' : maxWidth, '--cm-container-padding': spacing(padding),
      '--cm-container-padding-inline': paddingInline && spacing(paddingInline), '--cm-container-padding-block': paddingBlock && spacing(paddingBlock),
      maxWidth: fluid ? 'none' : maxWidth }, style] }, s.default?.())
})

export const CmPage = component('CmPage', (a, s) => {
  const { as = 'section', class: className, padding, maxWidth = '100%', gap, fullWidth, ...attrs } = a
  return element(as, { ...attrs, class: classes('cm-page', fullWidth !== false && 'cm-page--full-width', className),
    style: [{ '--cm-page-gap': spacing(gap), '--cm-page-padding': padding === 'none' ? '0px' : spacing(padding),
      '--cm-page-max-width': maxWidth }, attrs.style] }, s.default?.())
})

export const CmPageHeader = component('CmPageHeader', (a, s) => {
  const { title, description, align = 'start', layout: headerLayout, class: className, ...attrs } = a
  return element('header', { ...attrs, class: classes('cm-page-header', headerLayout === 'wrap' && 'cm-page-header--wrap', 'cm-page-header--align-' + align, className) }, [
    s.icon ? element('div', { class: 'cm-page-header__icon' }, s.icon()) : null,
    element('div', { class: 'cm-page-header__content' }, [
      s.eyebrow ? element('div', { class: 'cm-page-header__overline' }, s.eyebrow()) : null,
      element('h1', { class: 'cm-page-header__title' }, s.title?.() ?? title),
      description ? element('p', { class: 'cm-page-header__description' }, description) : null,
    ]),
    s.actions ? element('div', { class: 'cm-page-header__actions' }, s.actions()) : null,
  ])
})

export const CmSectionHeader = component('CmSectionHeader', (a, s) => {
  const { title, description, headingLevel = 2, bordered, padded, class: className, ...attrs } = a
  const content = element('div', { class: 'cm-section-header__content' }, [
    element('h' + headingLevel, { class: 'cm-section-header__title' }, s.title?.() ?? title),
    (s.description || description) ? element('p', { class: 'cm-section-header__description' }, s.description?.() ?? description) : null,
  ])
  return element('header', { ...attrs, class: classes('cm-section-header', bordered && 'cm-section-header--bordered', padded && 'cm-section-header--padded', className) }, [
    s.icon ? h(CmRow, { gap: 'sm', minWidth: 0 }, { default: () => [
      h(CmIconBadge, { tone: 'primary', 'aria-hidden': true }, { default: s.icon }), content,
    ] }) : content,
    s.actions ? element('div', { class: 'cm-section-header__actions' }, s.actions()) : null,
  ])
})

export const CmCard = component('CmCard', (a, s) => {
  const { class: className, variant = 'surface', tone = 'default', padding = 'md', bodyPadding = padding, pattern,
    elevated, accent, interactive, as = 'div', ...attrs } = a
  const structured = s.header || s.footer || s.aside || s.cover
  const children = s.default?.()
  return element(as, { ...attrs, class: classes('cm-card', 'cm-card--' + variant, 'cm-card--tone-' + tone,
    elevated ? 'cm-card--elevated' : 'cm-card--flat', !structured && 'cm-card--padding-' + padding,
    s.aside && 'cm-card--with-aside', pattern && pattern !== 'none' && 'cm-card--patterned cm-card--pattern-' + pattern,
    accent && accent !== 'none' && 'cm-card--accent-' + accent, interactive && 'cm-card--interactive', className) },
  structured ? [
    s.cover ? element('div', { class: 'cm-card__cover' }, s.cover()) : null,
    s.header ? element('div', { class: 'cm-card__header' }, s.header()) : null,
    element('div', { class: classes('cm-card__body', 'cm-card--padding-' + bodyPadding, s.aside && 'cm-card__body--with-aside') }, [
      s.aside ? element('div', { class: 'cm-card__main' }, children) : children,
      s.aside ? element('div', { class: 'cm-card__aside' }, s.aside()) : null,
    ]),
    s.footer ? element('div', { class: 'cm-card__footer' }, s.footer()) : null,
  ] : children)
})

const gridBreakpoints = ['', '-sm', '-md', '-lg', '-xl'] as const
const gridNames = ['base', 'sm', 'md', 'lg', 'xl'] as const
function responsive(value: unknown, fallback: unknown) {
  let resolved = fallback
  return gridNames.map(name => {
    resolved = typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[name] ?? resolved : value ?? resolved
    return resolved
  })
}

export const CmGridContainer = component('CmGridContainer', (a, s) => {
  const { as = 'div', columns, spacing: gap, preset = 'default', style, class: className, row, rowGap, columnGap,
    rowSpacing, columnSpacing, templateColumns, autoFit, autoFill, minColumnWidth, variant, ...attrs } = a
  const presetWidth = { filters: '12rem', metrics: '14rem', form: '16rem' }[preset as 'form']
  const template = templateColumns !== undefined
  const automatic = !template && ((autoFit !== undefined && autoFit !== false) || (autoFill !== undefined && autoFill !== false) ||
    minColumnWidth !== undefined || presetWidth !== undefined)
  const resolved = responsive(columns ?? { base: 1, md: 2, xl: 4 }, 1)
  const rows = responsive(rowSpacing ?? rowGap ?? gap, '1rem')
  const colGaps = responsive(columnSpacing ?? columnGap ?? gap, '1rem')
  const widths = responsive(minColumnWidth, presetWidth ?? '16rem')
  const tracks = responsive(templateColumns, 'minmax(0, 1fr)')
  const variables: Record<string, unknown> = {}
  gridBreakpoints.forEach((suffix, index) => {
    variables['--grid-columns-' + gridNames[index]] = resolved[index]
    variables['--grid-row-gap' + suffix] = spacing(rows[index])
    variables['--grid-column-gap' + suffix] = spacing(colGaps[index])
    if (automatic) variables['--grid-min-column-width-' + gridNames[index]] = widths[index]
    if (template) variables['--grid-template-columns-' + gridNames[index]] = tracks[index]
  })
  if (automatic) variables['--grid-auto-mode'] = autoFill !== undefined && autoFill !== false ? 'auto-fill' : 'auto-fit'
  return element(as, { ...attrs, class: classes('cm-grid-container', preset !== 'default' && 'cm-grid-container--preset-' + preset,
    automatic && 'cm-grid-container--auto', template && 'cm-grid-container--template', row !== undefined && row !== false && 'cm-grid-container--row',
    variant === 'actions' && 'cm-grid-container-actions', className), style: [variables, style] }, s.default?.())
})

export const CmMetricGrid = component('CmMetricGrid', (a, s) => {
  const { label, columns = { base: 1, sm: 2, xl: 4 }, ...attrs } = a
  return h(CmGridContainer, { ...attrs, as: 'section', columns, spacing: 'md', 'aria-label': label }, s)
})

export const CmMetricCard = component('CmMetricCard', (a, s) => {
  const { title, value, description, tone = 'default', variant = 'surface', trend, class: className, ...attrs } = a
  return element('div', { ...attrs, class: classes('cm-metric-card', 'cm-metric-card--tone-' + tone, variant !== 'surface' && 'cm-metric-card--' + variant, className) }, [
    element('div', { class: 'cm-metric-card__header' }, [
      element('span', { class: 'cm-metric-card__title' }, title),
      s.icon ? element('span', { class: 'cm-metric-card__icon' }, s.icon()) : null,
    ]),
    element('div', { class: 'cm-metric-card__body' }, [
      element('span', { class: 'cm-metric-card__value' }, s.value?.() ?? value),
      description ? element('span', { class: 'cm-metric-card__description' }, description) : null,
    ]),
    trend ? element('div', { class: 'cm-metric-card__trend' }, [
      element('span', { class: classes('cm-metric-card__trend-value', trend.value > 0 && 'cm-metric-card__trend-value--positive', trend.value < 0 && 'cm-metric-card__trend-value--negative') },
        (trend.value > 0 ? '↑ ' : trend.value < 0 ? '↓ ' : '') + (trend.formattedValue ?? Math.abs(trend.value) + '%')),
      element('span', { class: 'cm-metric-card__trend-label' }, trend.label),
    ]) : null,
    s.footer ? element('div', { class: 'cm-metric-card__footer' }, s.footer()) : null,
  ])
})

export const CmBadge = component('CmBadge', (a, s) => {
  const { tone = 'default', size = 'md', variant = 'soft', class: className, ...attrs } = a
  return element('span', { ...attrs, class: classes('cm-badge', 'cm-badge--' + variant, 'cm-badge--' + tone, 'cm-badge--' + size, className) }, s.default?.())
})

export const CmIconBadge = component('CmIconBadge', (a, s) => {
  const { tone = 'default', variant = 'soft', size = 'sm', class: className, ...attrs } = a
  return element('span', { ...attrs, class: classes('cm-icon-badge', 'cm-icon-badge--' + variant, 'cm-icon-badge--tone-' + tone, 'cm-icon-badge--' + size, className) }, s.default?.())
})

export const CmStatusDot = component('CmStatusDot', (a) => {
  const { tone = 'default', pulse, class: className, ...attrs } = a
  return element('span', { ...attrs, class: classes('cm-status-dot', 'cm-status-dot--' + tone, pulse && 'cm-status-dot--pulse', className) })
})

export const CmSeparator = component('CmSeparator', (a) => {
  const { orientation = 'horizontal', spacing: gap = 'md', length, class: className, style, ...attrs } = a
  return element('span', { ...attrs, role: 'separator', 'aria-orientation': orientation === 'vertical' ? orientation : undefined,
    class: classes('cm-separator', 'cm-separator--' + orientation, 'cm-separator--spacing-' + gap, className),
    style: [{ '--cm-separator-length': typeof length === 'number' ? `${length}px` : length }, style] })
})

export const CmEmpty = component('CmEmpty', (a, s) => element('div', { class: classes('cm-empty', a.class) }, [
  s.icon ? element('div', { class: 'cm-empty__icon' }, s.icon()) : null,
  element('h3', { class: 'cm-empty__title' }, a.title ?? 'Nenhum resultado'),
  a.description ? element('p', { class: 'cm-empty__description' }, a.description) : null,
  s.actions ? element('div', { class: 'cm-empty__actions' }, s.actions()) : null,
]))
