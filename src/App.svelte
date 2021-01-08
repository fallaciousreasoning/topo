<script lang="ts">
	import Section from "./components/Section.svelte";
	import TopoMap from "./TopoMap.svelte";
</script>

<TopoMap />
<Section page="settings" title="Settings">
	<div class="w-full border-t border-foreground mt-1" />
	<div>
		<h4 class="mt-2 font-semibold text-base">Appearance</h4>
		<div>Theme Color</div>
		<div> Background Color</div>
	</div>
	<div class="w-full border-t border-foreground mt-1" />
	<div>
		<h4 class="mt-2 font-semibold text-base">Layers</h4>
	</div>
</Section>
