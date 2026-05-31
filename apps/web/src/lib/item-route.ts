/** Static-export-safe item detail URL (`output: export` cannot serve arbitrary `/item/[id]`). */
export function itemHref(id: string) {
  return `/item?id=${encodeURIComponent(id)}`;
}

export function itemIdFromSearchParam(value: string | null | undefined) {
  const id = value?.trim();
  return id ? id : undefined;
}
