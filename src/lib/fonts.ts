/**
 * Font wiring (offline-first).
 *
 * Previously Inter + Lora via next/font/google — a build/dev-time NETWORK
 * dependency on fonts.gstatic.com that broke every offline environment and
 * cost field devices render-blocking downloads on 2G. Replaced with system
 * stacks: zero downloads, instant paint, full Arabic-script coverage from OS
 * fonts (critical for the ar locale).
 *
 * Same shape as before ({ variable }) so layout code is untouched: the
 * classes set the CSS vars consumed by the @theme font tokens.
 */
export const fontSans = {
    variable: 'font-system-sans',
};

export const fontSerif = {
    variable: 'font-system-serif',
};
