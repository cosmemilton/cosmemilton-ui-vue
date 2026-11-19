import { cloneVNode, isVNode, type VNodeChild } from 'vue'
import { classes, component, element, slotValue } from './primitives.js'

export const CmItem = component('CmItem', (attributes, slots) => {
  const { class: className, onClick, title: _title, description: _description, meta: _meta, ...rest } = attributes
  const title = slotValue(slots, attributes, 'title')
  const description = slotValue(slots, attributes, 'description')
  const meta = slotValue(slots, attributes, 'meta')
  return element(onClick ? 'button' : 'div', {
    ...rest,
    type: onClick ? 'button' : undefined,
    onClick,
    class: classes('cm-item', onClick && 'cm-item--interactive', className),
  }, [
    element('div', { class: 'cm-item__body' }, [
      element('span', { class: 'cm-item__title' }, title),
      description ? element('span', { class: 'cm-item__description' }, description) : null,
    ]),
    meta ? element('span', { class: 'cm-item__meta' }, meta) : null,
  ])
})

export const CmKbd = component('CmKbd', (attributes, slots) => {
  const { asChild, class: className, ...rest } = attributes
  const content = slots.default?.() ?? []
  const props = { ...rest, class: classes('cm-kbd', className) }
  if ((asChild === '' || asChild === true) && content.length === 1 && isVNode(content[0])) {
    return cloneVNode(content[0], props)
  }
  return element('kbd', props, content)
})

export type CmBreadcrumbItem = { label: VNodeChild; href?: string; id?: string | number }

export const CmBreadcrumb = component('CmBreadcrumb', (attributes, slots) => {
  const { items = [], class: className, 'aria-label': label = 'breadcrumb', ...rest } = attributes
  const entries = items as CmBreadcrumbItem[]
  return element('nav', { ...rest, 'aria-label': label, class: classes('cm-breadcrumb', className) },
    entries.map((item, index) => {
      const current = index === entries.length - 1
      const labelNode = slots.label?.({ item, index, current }) ?? item.label
      const crumb = item.href && !current
        ? element('a', { href: item.href, class: 'cm-breadcrumb__link' }, labelNode)
        : element('span', { 'aria-current': current ? 'page' : undefined, class: current ? 'cm-breadcrumb__current' : undefined }, labelNode)
      return element('span', { key: item.id ?? index, class: 'cm-breadcrumb__item' }, [
        crumb,
        !current && element('span', { 'aria-hidden': 'true', class: 'cm-breadcrumb__separator' }, '/'),
      ])
    }))
})
