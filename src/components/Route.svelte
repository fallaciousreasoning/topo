<script lang="ts">
  import fragment from '../stores/fragment'
  export let path: string = ''

  const getMatchInfo = (page) => {
    if (!page)
        return page === path;

    const pathParts = path.split('/');
    const pageParts = page.split('/')

    if (pageParts.length !== pathParts.length) return false

    const params = {}
    for (let i = 0; i < pageParts.length; ++i) {
      const pathPart = pathParts[i]
      const pagePart = pageParts[i]

      if (pathPart.startsWith(':')) {
        params[pathPart.substring(1)] = pagePart
        continue
      }

      if (pathPart !== pagePart) return false
    }

    return params
  }

  $: params = getMatchInfo($fragment.page);
</script>

{#if params}
  <slot {params} />
{/if}
