export interface PluralizeOptions {
  plural?: string
}

export function pluralize(
  count: number,
  singular: string,
  options: PluralizeOptions = {},
): string {
  const plural = options.plural ?? `${singular}s`
  return `${count} ${count === 1 ? singular : plural}`
}
