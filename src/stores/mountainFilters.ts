import { writable } from "svelte/store";

export const scrollPos = writable(0);

export const direction = writable<'ascending' | 'descending'>('descending')
export const sortBy = writable(0)
export const onlyWithPicture = writable(false)
export const filterText = writable('')
export const visibleOnly = writable(false)

export const alpine = writable(false)
export const rock = writable(false)
export const ice = writable(false)
export const mixed = writable(false)
