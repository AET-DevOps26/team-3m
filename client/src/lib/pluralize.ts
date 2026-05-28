export interface PluralizeOptions {
  plural?: string
  locale?: string
}

export function pluralize(
  count: number,
  singular: string,
  options: PluralizeOptions = {},
): string {
  const plural = options.plural ?? `${singular}s`
  const locale =
    options.locale ??
    (typeof navigator !== "undefined" ? navigator.language : "en")
  const rules = new Intl.PluralRules(locale)
  return `${count} ${rules.select(count) === "one" ? singular : plural}`
}
