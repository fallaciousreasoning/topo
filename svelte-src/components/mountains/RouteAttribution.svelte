<script lang="ts">
    import { type Route } from "../../stores/mountains"
    export let route: Route;
</script>

<div class="italic text-gray-600">{route.ascent}</div>
