<script lang="ts">
import { layerDefinitions } from "../layers/layerDefinitions";
import settings from '../stores/settings';

import Section from "./Section.svelte";
import Checkbox from './Checkbox.svelte';
import { onMount } from "svelte";
    import Card from "./Card.svelte"

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
		<h4 class="mt-2 font-semibold text-base">Layers</h4>
		<div class="flex flex-col gap-2 my-1">
		{#each layerDefinitions.filter(l => l.type === "base") as layer}
			<Card>
				<h5 class="font-semibold">{layer.name}</h5>
				<div class="text-gray-500 italic">{layer.description}</div>
				<Checkbox label="Cache Viewed Tiles"
					checked={$settings.baseLayers[layer.name].cache}
					on:change={e => settings.updateBaseLayer(layer.name, { cache: e.target['checked'] })}/>
				<div>Currently using 0 bytes of storage.</div>
			</Card>
		{/each}
	</div>
	</div>
</Section>
