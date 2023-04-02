import { writable } from "svelte/store";

export const direction = writable<'ascending' | 'descending'>('descending')
export const sortBy = writable(0)
export const onlyWithPicture = writable(false)
export const filterText = writable('')
