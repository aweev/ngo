/**
 * Ambient declarations that let `pnpm verify:functions` type-check the Deno Edge
 * Functions in `supabase/functions/` with the project's own TypeScript.
 *
 * Those functions are excluded from the Next.js `tsconfig.json` (they run on
 * Deno), so before this gate nothing type-checked them: a doc block that was
 * never closed swallowed notification-dispatcher's `import` statements, leaving
 * every helper undefined at runtime, and no gate noticed (the grep-based
 * reliability check even matched `requireCronSecret` inside the dead import).
 *
 * Only the surface the functions actually use is declared. `deno check` remains
 * authoritative when Deno is installed; this keeps the same class of regression
 * out of CI where it is not.
 */
declare namespace Deno {
    /** Registers the HTTP handler for one Edge Function. */
    function serve(handler: (req: Request) => Response | Promise<Response>): void;
    const env: { get(key: string): string | undefined };
}