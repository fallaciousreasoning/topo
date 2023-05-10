<script lang="ts">
	import { onMount, tick } from 'svelte';
    import View from '../ol/View.svelte'

	// props
	export let items;
	export let height = '100%';
	export let itemHeight = undefined;

	export let scrollPos: number = 0;

	// Handle changes to the scroll binding.
	$: {
		if (viewport && scrollPos != viewport?.scrollTop) {
			setTimeout(() => scrollTo(scrollPos))
		}
	}

	let lastItems = [];

	// read-only, but visible to consumers via bind:start
	export let start = 0;
	export let end = 0;

	// local state
	let height_map = [];
	let rows;
	let viewport: HTMLElement;
	let contents;
	let viewport_height = 0;
	let visible;
	let mounted;

	let top = 0;
	let bottom = 0;
	let average_height;

	$: visible = items.slice(start, end).map((data, i) => {
		return { index: i + start, data };
	});

	// whenever `items` changes, invalidate the current heightmap
	$: if (mounted) refresh(items, viewport_height, itemHeight);

	async function refresh(items, viewport_height, itemHeight) {
		const { scrollTop } = viewport;

		await tick(); // wait until the DOM is up to date

		let content_height = top - scrollTop;
		let i = start;

		while (content_height < viewport_height && i < items.length) {
			let row = rows[i - start];

			if (!row) {
				end = i + 1;
				await tick(); // render the newly visible row
				row = rows[i - start];
			}

			const row_height = height_map[i] = itemHeight || row.offsetHeight;
			content_height += row_height;
			i += 1;
		}

		end = i;

		const remaining = items.length - end;
		average_height = (top + content_height) / end;

		bottom = remaining * average_height;
		height_map.length = items.length;

		// If some of the items have changed, scroll to the top.
		if (items.length !== lastItems.length || items.some((a, i) => a !== items[i])) {
			viewport.scrollTo(0, 0)
		}
		lastItems = items
	}

	async function handle_scroll() {
		const { scrollTop } = viewport;

		const old_start = start;

		for (let v = 0; v < rows.length; v += 1) {
			height_map[start + v] = itemHeight || rows[v].offsetHeight;
		}

		let i = 0;
		let y = 0;

		while (i < items.length) {
			const row_height = height_map[i] || average_height;
			if (y + row_height > scrollTop) {
				start = i;
				top = y;

				break;
			}

			y += row_height;
			i += 1;
		}

		while (i < items.length) {
			y += height_map[i] || average_height;
			i += 1;

			if (y > scrollTop + viewport_height) break;
		}

		end = i;

		const remaining = items.length - end;
		average_height = y / end;

		while (i < items.length) height_map[i++] = average_height;
		bottom = remaining * average_height;

		scrollPos = viewport.scrollTop;
		// TODO if we overestimated the space these
		// rows would occupy we may need to add some
		// more. maybe we can just call handle_scroll again?
	}

	export async function scrollToIndex (index: number) {
		let last = -1
		while (start !== index && last !== start) {
			await tick()


			const dir = start < index ? 1 : -1
			const scrollBy = height_map[start] || average_height || height

			viewport.scrollBy({ top: dir*scrollBy })

			last = start
			await handle_scroll()
		}

		// It's possible that after scrolling we might be a little off, so make
		// sure we align the item at |index| exactly with the top.
		const offset = viewport.scrollTop - height_map.slice(0, start).reduce((prev, next) => prev + next, 0)
		viewport.scrollBy({ top: -offset })
		await handle_scroll()
	}

	export async function scrollTo(y: number) {
		let last = -1
		const dir = viewport.scrollTop < y ? 1 : -1
		while (((viewport.scrollTop < y && dir < 0) || (viewport.scrollTop > y && dir > 0))
			&& last !== viewport.scrollTop) {
			await tick();

			const scrollBy = height_map[start] || average_height || height

			console.log(dir, scrollBy, viewport.scrollTop, y)
			
			last = viewport.scrollTop
			viewport.scrollBy({ top: dir * scrollBy })

			await handle_scroll()
		}

		const offset = viewport.scrollTop - y
		viewport.scrollBy({ top: -offset })
		await handle_scroll()
	}

	$:window['items'] = items
	window['scrollListTo'] = scrollTo
	
	// trigger initial refresh
	onMount(() => {
		rows = contents.getElementsByTagName('svelte-virtual-list-row');
		mounted = true;
	});
</script>

<style>
	svelte-virtual-list-viewport {
		position: relative;
		overflow-y: auto;
		-webkit-overflow-scrolling:touch;
		display: block;
	}

	svelte-virtual-list-contents, svelte-virtual-list-row {
		display: block;
	}

	svelte-virtual-list-row {
		overflow: hidden;
	}
</style>

<svelte-virtual-list-viewport
	bind:this={viewport}
	bind:offsetHeight={viewport_height}
	on:scroll={handle_scroll}
	style="height: {height};"
>
	<svelte-virtual-list-contents
		bind:this={contents}
		style="padding-top: {top}px; padding-bottom: {bottom}px;"
	>
		{#each visible as row (row.index)}
			<svelte-virtual-list-row>
				<slot item={row.data}>Missing template</slot>
			</svelte-virtual-list-row>
		{/each}
	</svelte-virtual-list-contents>
</svelte-virtual-list-viewport>
