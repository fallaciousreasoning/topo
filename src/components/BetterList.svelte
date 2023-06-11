<script lang="ts">
    import { onMount, tick } from "svelte"
    import View from "../ol/View.svelte"

    export let items: any[]
    export let height = '100%'

    export let scrollPos: number = 0

    let heightMap = new WeakMap<any, {
        offset: number,
        height: number
    }>();

    let viewport: HTMLElement
    let viewportHeight = 0

    let contents: HTMLElement;

    let top = 0
    let bottom = 0
    let averageHeight = 0

    let startHeight = 0
    let start = 0
    let endHeight = 0
    let end = 0

    let mounted = false

    let rows: any
    $: visible = items.slice(start, end).map((data, i) => ({
        index: i + start,
        data
    }))

    $: if(mounted) updateStartAndEnd(top, bottom, items)

    async function updateStartAndEnd(top, bottom, items) {
        if (top === bottom) return

        let y = 0
        for (let i = 0; i < items.length; ++i) {
            if (y >= bottom) break

            if (!heightMap.has(items[i])) {
                // update start/end and render row
                if (y <= top) {
                    start = i
                    startHeight = y
                }
                end = i + 1

                await tick()

                console.log(`Rendered ${start} to ${end}`)

                const row = contents.querySelector(`l-row[data-row="${i}"]`)
                if (!row) {
                    console.log(contents.childNodes)
                    console.log("Something went wrong!")
                    break
                }
                heightMap.set(items[i], {
                    offset: row['offsetHeight'],
                    height: row.clientHeight
                })
            }

            const info = heightMap.get(items[i])
            if (y <= top && y + info.height >= top) {
                start = i
                startHeight = y
            }

            endHeight = y
            end = i + 1

            if (y > bottom) {
                break
            }
        }

        console.log(`Start: ${start}, End: ${end}, Top: ${top}, Bottom: ${bottom}`)
    }

    function onScroll() {
        top = viewport.scrollTop
        bottom = top + viewport.clientHeight
        scrollPos = top
    }

    onMount(() => {
        mounted = true
        rows = contents.getElementsByTagName('l-row')
        onScroll()
    })
</script>

<style>
    l-viewport {
        position: relative;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        display: block;
    }

    l-contents, l-row {
        display: block;
    }

    l-row {
        overflow: hidden;
    }
</style>

<l-viewport
    bind:this={viewport}
    bind:offsetHeight={viewportHeight}
    on:scroll={onScroll}
    style:height="{height}">
    <l-contents bind:this={contents}
        style:padding-top="{startHeight}px"
        style:padding-bottom="{bottom}px">
        {#each visible as row (row.index)}
            <l-row data-row={row.index}>
                <slot item={row.data}>No template</slot>
            </l-row>
        {/each}

    </l-contents>
</l-viewport>
