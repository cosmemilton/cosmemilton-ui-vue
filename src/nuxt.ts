import { addComponent, createResolver, defineNuxtModule } from '@nuxt/kit'
import * as library from './index.js'

export default defineNuxtModule<{ styles?: boolean }>({
  meta: { name: '@cosmemilton/ui-vue', configKey: 'cosmemilton' },
  defaults: { styles: true },
  setup(options: { styles?: boolean }, nuxt: { options: { css: string[] } }) {
    const resolver = createResolver(import.meta.url)
    const filePath = resolver.resolve('./index.js')
    if (options.styles) nuxt.options.css.push(resolver.resolve('./styles.css'))
    for (const name of Object.keys(library).filter(name => /^Cm[A-Z]/.test(name))) {
      addComponent({ name, export: name, filePath })
    }
  },
})