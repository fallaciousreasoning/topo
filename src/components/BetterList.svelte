<script lang="ts">
  import { onMount, tick } from 'svelte'
  import VirtualList from './VirtualList.svelte'

  export let items: any[]
  export let height = '100%'

  export let scrollPos: number = 0
  let initialScrollPos = scrollPos

  // Number of additional elements out of view. Helps when scrolling fast.
  export let pad = 1

  let heightMap = new WeakMap<
    any,
    {
      offset: number
      height: number
    }
  >()
  let heights = []
  window['heights'] = heights

  let viewport: HTMLElement
  let contents: HTMLElement

  let top = 0
  let bottom = 0
  let averageHeight = 0

  let start = 0
  let end = 0

  let mounted = false

  let visible = []
  function updateVisible() {
    const s = Math.max(0, start - pad)
    const e = Math.min(end + pad, items.length - 1)
    visible = items.slice(s, e).map((data, i) => ({
      index: i + s,
      data,
    }))
  }
  updateVisible()

  $: if (mounted) updateStartAndEnd(top, bottom, items)

  async function updateStartAndEnd(...args: any) {
    if (top === bottom) return

    start = 0
    let y = 0
    for (let i = 0; i < items.length; ++i) {
      if (y >= bottom) {
        break
      }

      if (!heightMap.has(items[i])) {
        // update start/end and render row
        if (y <= top) {
          start = i
        }
        end = Math.max(start, i) + 1
        updateVisible()

        await tick()

        const row = contents.querySelector(`l-row[data-row="${i}"]`)
        if (!row) {
          console.error("Didn't manage to render row", i)
          break
        }

        heightMap.set(items[i], {
          offset: y,
          height: row['offsetHeight'],
        })
        heights[i] = heightMap.get(items[i])
      }

      const info = heightMap.get(items[i])
      if (y <= top) {
        start = i
      }

      y += info.height
      end = i + 1
    }

    averageHeight =
      heights.reduce((prev, next) => prev + next.height, 0) / heights.length
    updateVisible()
  }

  function onScroll() {
    top = viewport.scrollTop
    bottom = top + viewport.clientHeight
    scrollPos = top
  }

  onMount(() => {
    mounted = true
    onScroll()

    if (initialScrollPos !== 0) {
      setTimeout(() => (viewport.scrollTop = initialScrollPos))
    }
  })
</script>

<l-viewport
  bind:this={viewport}
  on:resize={onScroll}
  on:scroll={onScroll}
  style:height>
  <l-contents
    bind:this={contents}
    style:height="{averageHeight * items.length}px">
    {#each visible as row}
      <l-row
        data-row={row.index}
        style:top="{heights[row.index]?.offset ?? averageHeight * row.index}px">
        <slot item={row.data}>No template</slot>
      </l-row>
    {/each}
  </l-contents>
</l-viewport>

<style>
  l-viewport {
    position: relative;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    display: block;
  }

  l-contents,
  l-row {
    display: block;
  }

  l-contents {
    position: relative;
  }

  l-row {
    overflow: hidden;
    position: absolute;
    left: 0;
    right: 0;
  }
</style>
