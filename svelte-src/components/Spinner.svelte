<script lang="ts">
  let clazz = "text-foreground";
  export let mode: 'determinate' | 'indeterminate' = 'indeterminate'
  export let percent: number = 0
  
  // 2 * PI * 10
  const circumfrence = 62.83;
  export { clazz as class };
</script>
<div class="h-9 py-2">
  {#if mode === 'indeterminate'}
  <svg class={`animate-spin h-full w-full ${clazz}`} fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
  {:else}
  <svg class={`h-full w-full ${clazz}`} fill="none" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <circle class="opacity-75 text-primary transform -rotate-90 origin-center stroke-current" cx="12" cy="12" r="10" stroke-width="4" stroke-dasharray={circumfrence} stroke-dashoffset={circumfrence * (1 - percent)}/>
  </svg>
  {/if}
</div>
