<script lang="ts">
  import { type Route } from '../../stores/mountains'
  import {
    type Level,
    guessContext,
    levelCalculator,
    parseGrade,
  } from '../../utils/grade'

  export let route: Route

  const levelColors: { [P in Level]: string } = {
    beginner: 'bg-green-500',
    intermediate: 'bg-yellow-400',
    experienced: 'bg-orange-400',
    expert: 'bg-red-600',
    elite: 'bg-purple-800',
  }

  let grades = Object.entries(parseGrade(route.grade))

  let type = guessContext(route.grade)
  let bg = levelColors[levelCalculator[type](route.grade)]
</script>

{#each grades as [type, grade]}
  <span
    title={type}
    class="p-1 rounded {levelColors[
      levelCalculator[type](grade)
    ]} text-white mr-1">{grade}</span>
{/each}
