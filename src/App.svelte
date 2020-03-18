<script>
	import TopoMap from './TopoMap.svelte';
	import LinearProgress from '@smui/linear-progress';
	import AppDrawer from './AppDrawer.svelte';

	import { progress } from './stores';
</script>

<TopoMap/>
<LinearProgress class="progress" closed={$progress === 0 || $progress === 1} progress={$progress}/>
<AppDrawer/>
<style>
    :global(.progress) {
		z-index: 1000;
	}

	:global(body) {
		padding: 0;
	}
</style>