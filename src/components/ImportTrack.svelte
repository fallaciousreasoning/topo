<script lang="ts">
  import type { Track } from '../db/track'
  import fragment from '../stores/fragment'
  import { insertItem } from '../db'

  export let data: string

  try {
    let parsed = JSON.parse(data) as Track
    if (!parsed.points?.length) {
      $fragment.page = null
    }

    if (!parsed.created) parsed.created = Date.now()

    if (!parsed.updated) parsed.updated = Date.now()

    insertItem('tracks', parsed).then(
      (t) => ($fragment.page = `tracks/${t.id}`)
    )
  } catch (err) {
    console.log('Failed to import track!', err);
    $fragment.page = null;
  }
</script>
