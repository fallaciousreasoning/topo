<script lang="ts">
  export let imageUrl = ''
</script>

<div class="bg-white rounded shadow w-full h-full overflow-hidden">
  {#if imageUrl}
      <img class="h-64 w-full object-cover object-top" src={imageUrl} />
  {/if}
  <div class="p-2">
    {#if $$slots.pretitle}
      <h4 class="text-md text-gray-600"><slot name="pretitle" /></h4>
    {/if}
    {#if $$slots.title}
      <h3 class="font-bold text-lg"><slot name="title" /></h3>
    {/if}
    <slot />
  </div>
</div>
