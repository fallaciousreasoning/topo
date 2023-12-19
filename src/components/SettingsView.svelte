<script lang="ts">
  import { layerDefinitions } from '../layers/layerDefinitions'
  import settings from '../stores/settings'

  import Section from './Section.svelte'
  import Checkbox from './Checkbox.svelte'
  import { onMount } from 'svelte'
  import Card from './Card.svelte'
  import { liveQuery } from 'dexie'
  import { db } from '../db'
  import { friendlyBytes } from '../utils/bytes'
  import Button from './Button.svelte'

  const sizes = liveQuery(async () => {
    const result = {}
    await db.tiles.each((t) => {
      if (!result[t.layer]) result[t.layer] = 0
      result[t.layer] += t.data.size
    })
    return result
  })

  onMount(() => {
    for (const layer of layerDefinitions) {
      if (!$settings.layers[layer.name]) {
        $settings.layers[layer.name] = {
          cache: false,
        }
      }
    }
  })
</script>

<Section page="settings" title="Settings">
  <div class="w-full border-t border-foreground mt-1" />
  <div>
    <h4 class="mt-2 font-semibold text-base">Layers</h4>
    <div class="flex flex-col gap-2 my-1">
      {#each layerDefinitions.filter((l) => l.type === 'base') as layer}
        <Card>
          <h5 class="font-semibold">{layer.name}</h5>
          <div class="text-gray-500 italic">{layer.description}</div>
          <Checkbox
            label="Cache Viewed Tiles"
            checked={$settings.layers[layer.name].cache}
            on:change={(e) =>
              settings.updateLayer(layer.name, {
                cache: e.target['checked'],
              })} />
          <div>
            Currently using {friendlyBytes($sizes?.[layer.name] ?? 0)} bytes of storage.
          </div>
          {#if $sizes?.[layer.name]}
            <Button
              on:click={async (e) => {
                if (
                  window.confirm(
                    `Are you sure you want to delete the tiles for ${layer.name}? They will not be available offline.`
                  )
                ) {
                  const tiles = await db.tiles
                    .where({ layer: layer.name })
                    .toArray()
                  await db.tiles.bulkDelete(tiles.map((t) => t.id))
                }
              }}>Delete Tiles</Button>
          {/if}
        </Card>
      {/each}
    </div>
  </div>
</Section>
