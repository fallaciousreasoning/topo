<script lang="ts">
  type Item = $$Generic<T>
  type Option =
    | keyof Item
    | {
        getter: (m: Item) => number | string
        name: string
      }

  interface $$Props {
    unsorted: Item[]
    sorted: Item[]
    options: Option[]
    sortIndex: number
  }

  export let options: Option[]
  export let direction: 'ascending' | 'descending' = 'descending'

  export let unsorted: Item[]
  export let sorted: Item[]

  export let selectedIndex = 0
  $: sortBy = options[selectedIndex]

  $: {
    sortBy
    direction

    const getValue =
      typeof sortBy !== 'object'
        ? (item: Item) => item[sortBy as any]
        : sortBy.getter

    sorted = unsorted.sort((a, b) => {
      const aValue = getValue(a)
      const bValue = getValue(b)

      if (typeof bValue === 'number' && typeof bValue === 'number')
        return direction === 'ascending' ? aValue - bValue : bValue - aValue

      const aString = aValue + ''
      const bString = bValue + ''

      return direction === 'ascending'
        ? bString.localeCompare(aString)
        : aString.localeCompare(bString)
    })
  }
</script>

<div>
  Sort by
  <div>
    <select class="capitalize" bind:value={selectedIndex}>
      {#each options as option, index}
        <option value={index}
          >{typeof option === 'object' ? option.name : option}</option>
      {/each}
    </select>
    <select bind:value={direction}>
      <option value="ascending">Ascending</option>
      <option value="descending">Descending</option>
    </select>
  </div>
</div>
