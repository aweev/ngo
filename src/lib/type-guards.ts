export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

export function isValidLocale(
    locale: unknown,
    supportedLocales: readonly string[]
): locale is string {
    return isString(locale) && supportedLocales.includes(locale);
}