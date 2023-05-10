<script lang="ts">
  import { Pitch } from '../../stores/mountains'
  import TopoText from '../TopoText.svelte'

  export let pitches: Pitch[];
</script>

<ol class="list-decimal ml-8">
  {#each pitches as pitch}
    <li>
      {pitch.ewbank}
      {pitch.alpine}
      {pitch.commitment}
      {pitch.mtcook}
      {pitch.aid}
      {pitch.ice}
      {pitch.mixed} ({pitch.length})
      <TopoText text={pitch.description} />
    </li>
  {/each}
</ol>
