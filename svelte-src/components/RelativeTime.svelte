<script lang="ts">
  import hdate from "human-date";
  import { onDestroy } from "svelte";

  export let time: Date | string | number;
  export let updateRate = 30;

  let relativeTime = undefined;
  let timeout = undefined;

  const updateRelativeTime = () => {
    relativeTime = hdate.relativeTime(time);
    timeout = setTimeout(updateRelativeTime, updateRate * 1000);
  };
  updateRelativeTime();

  onDestroy(() => {
    clearTimeout(timeout);
  });
</script>

{relativeTime}
