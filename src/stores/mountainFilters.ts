import { writable } from "svelte/store";

export const direction = writable<'ascending' | 'descending'>('descending')
export const sortBy = writable(0)
export const onlyWithPicture = writable(false)
export const filterText = writable('')
export const visibleOnly = writable(false)

export const alpine = writable(true)
export const rock = writable(true)
export const ice = writable(true)
export const mixed = writable(true)
