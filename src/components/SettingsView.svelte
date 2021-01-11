<script lang="ts">
import { layerDefinitions } from "../layers/layerDefinitions";
import settings from '../stores/settings';

import Section from "./Section.svelte";
import Checkbox from './Checkbox.svelte';
import { onMount } from "svelte";

onMount(() => {
    for (const layer of layerDefinitions) {
        if (!$settings.baseLayers[layer.name]) {
            $settings.baseLayers[layer.name] = {
                cache: false
            }
        }
    }
});
</script>

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
		{#each layerDefinitions.filter(l => l.type === "base") as layer}
			<div class="my-2">
				<h5 class="font-semibold">{layer.name}</h5>
				<div class="text-gray-500 italic">{layer.description}</div>
				<Checkbox label="Cache Viewed Tiles"
					checked={$settings.baseLayers[layer.name].cache}
					on:change={e => settings.updateBaseLayer(layer.name, { cache: e.target['checked'] })}/>
				<div>Currently using 0 bytes of storage.</div>
			</div>
		{/each}
	</div>
</Section>
