const FILTER_KEYS = ["q", "brand", "color", "memory", "diagonal", "processor", "min", "max", "rating", "stock", "discount", "model", "sort", "page"];

/** True when the catalog URL carries search, filter, sort or pagination params (duplicate of the canonical list). */
export function hasCatalogFilters(sp: Record<string, string | string[] | undefined>) {
  return FILTER_KEYS.some((k) => sp[k] !== undefined && sp[k] !== "");
}
