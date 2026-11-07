import { h } from 'vue'

/** Enlace de router mínimo: expone el slot con la misma forma que vue-router. */
export const RouterLinkStub = {
  name: 'RouterLink',
  props: {
    to: { type: [String, Object], default: '' }
  },
  emits: ['click'],
  setup(props, { slots, emit }) {
    return () => {
      const href = typeof props.to === 'string' ? props.to : '#'
      return h(
        'a',
        {
          href,
          onClick: (event) => emit('click', event)
        },
        slots.default?.({
          isActive: false,
          isExactActive: false,
          href,
          navigate: () => {}
        })
      )
    }
  }
}

/** Vista de router vacía para montar App sin cargar las vistas reales. */
export const RouterViewStub = {
  name: 'RouterView',
  render() {
    return h('div', { class: 'router-view-stub' })
  }
}

/** Componente simple que solo renderiza su contenido. */
export const passthroughStub = (name) => ({
  name,
  setup(_props, { slots }) {
    return () => h('div', { class: `stub-${name}` }, slots.default?.())
  }
})
