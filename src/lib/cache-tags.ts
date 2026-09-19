/**
 * Cache constants shared by the Supabase read clients and the
 * revalidation helpers.
 *
 * Deliberately dependency-free (no `next/cache` import) so it can be
 * consumed from the Supabase client factory without dragging the
 * Next.js cache runtime into non-request contexts.
 */

/** ISR / Data Cache window for public website content (seconds). */
export const PUBLIC_REVALIDATE_SECONDS = 300;

/** Data Cache tag covering every public read (public_* views + RPCs). */
export const PUBLIC_CONTENT_TAG = 'public-content';

/** Data Cache tag for the volunteer role board. */
export const PUBLIC_VOLUNTEER_TAG = 'public-volunteers';