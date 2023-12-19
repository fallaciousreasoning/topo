<script lang="ts">
  import TileLayer from 'ol/layer/Tile'
  import RenderEvent from 'ol/render/Event'
  import { Tile, XYZ } from 'ol/source'
  import { onMount } from 'svelte'
  import { getOlContext } from './Map.svelte'

  export let title: string = ''
  export let type: 'base' | 'overlay' | undefined = undefined
  export let source: Tile | string
  export let visible: boolean = true
  export let opacity = 1
  export let prerender: (e: RenderEvent) => void = undefined
  export let minZoom: number | undefined = undefined

  const { addLayer, removeLayer } = getOlContext()
  const layer = new TileLayer({
    ['id' as any]: title,
    ['title' as any]: title,
    ['type' as any]: type,
    ['visible' as any]: visible,
    minZoom,
    opacity,
    source: typeof source === 'string' ? new XYZ({ url: source }) : source,
  })

  layer.on('prerender', (e) => {
    prerender?.(e)
  })

  onMount(() => {
    addLayer(layer)
    return () => removeLayer(layer)
  })
</script>
