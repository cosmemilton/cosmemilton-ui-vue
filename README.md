# CosmeMilton UI para Vue

Componentes Vue 3 nativos com temas Aurora, Claro e Escuro. O pacote usa Composition API, slots e renderização Vue, incluindo em Nuxt. Os estilos e fontes são empacotados.

## Vue 3

Instale o pacote na aplicação e importe a folha de estilos uma vez.

    import '@cosmemilton/ui-vue/styles.css'
    import { CmButton, CmThemeProvider, CmToastProvider } from '@cosmemilton/ui-vue'

Coloque as páginas dentro de CmThemeProvider e CmToastProvider para usar useCmTheme() e useCmToast().

## Nuxt

Adicione @cosmemilton/ui-vue/nuxt a modules no nuxt.config.ts. O módulo registra os componentes e a folha de estilos. Para controlar a importação da folha manualmente, configure cosmemilton.styles como false.

O pacote inclui os componentes usados nos logins, cabeçalho, menu, formulários, tabelas e dashboards do Aurora. A API Vue usa slots, eventos e v-model. Consulte as exportações em src/index.ts. A paridade de todos os componentes e variantes da edição React permanece incompleta.

## Build local

    npm ci
    npm run build
    npm pack

A folha de estilos e as fontes foram reaproveitadas de @cosmemilton/ui. O aviso ISC está em LICENSE e os avisos Open Font License permanecem em assets/fonts.