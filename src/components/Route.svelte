<script lang="ts">
  import fragment from '../stores/fragment'

  export let path: string = ''
  export let exact: boolean = false

  const getMatchInfo = (page) => {
    if (!page)
        return page === path;

    const pathParts = path.split('/');
    const pageParts = page.split('/')

    if (exact && pageParts.length !== pathParts.length) return false

    const params = {}
    for (let i = 0; i < pathParts.length; ++i) {
      const pathPart = pathParts[i]
      const pagePart = pageParts[i]

      if (pathPart.startsWith(':')) {
        params[pathPart.replace(/(^:)|(\?$)/gi, '')] = pagePart

        // We can't have empty path parts, unless the user has said they can be
        // empty.
        if (!pathPart && !pagePart.endsWith('?')) return false;
        continue
      }

      if (pathPart !== pagePart) return false
    }

    return params
  }

  $: params = getMatchInfo($fragment.page) as { [key: string]: string };
</script>

{#if params}
  <slot {params} />
{/if}
