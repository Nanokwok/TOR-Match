/**
 * What the browser is told to drop when a session ends (ASVS V14.3.1): its HTTP
 * cache, so a page shown to the signed-in user cannot be reopened from it, and
 * the page's local and session storage. Cookies are expired by name in the logout route
 * instead of with the "cookies" directive, which would also clear cookies of
 * other apps on the same domain.
 */
export const CLEAR_SITE_DATA = '"cache", "storage"'
