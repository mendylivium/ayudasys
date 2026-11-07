import '../css/app.css'

import { createApp, h } from 'vue'
import { createInertiaApp } from '@inertiajs/vue3'

const appName = 'AyudaSys'

createInertiaApp({
  title: (title) => (title ? `${title} · ${appName}` : appName),
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.vue')
    const page = pages[`./Pages/${name}.vue`]
    if (!page) throw new Error(`Page not found: ./Pages/${name}.vue`)
    return page()
  },
  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(App, props) })
      .use(plugin)
      .mount(el)
  },
  progress: {
    color: 'var(--color-primary)',
  },
})
