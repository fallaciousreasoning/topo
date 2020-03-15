<script>
	import TopoMap from './TopoMap.svelte';
	import LinearProgress from '@smui/linear-progress';
</script>

<TopoMap/>
<LinearProgress class="progress" indeterminate closed/>

<style>
    :global(.progress) {
		z-index: 1000;
	}

	:global(body) {
		padding: 0;
	}
</style>