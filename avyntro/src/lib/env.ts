/** Public, build-time configuration. Server secrets live in demo/config.ts. */

function cleanUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.origin + u.pathname.replace(/\/$/, '');
  } catch {
    return null;
  }
}

/** Production origin, e.g. https://www.example.com. Null until configured. */
export const siteUrl = cleanUrl(process.env.NEXT_PUBLIC_SITE_URL);

/** Application sign-in URL. The Sign in link renders only when set. */
export const signInUrl = cleanUrl(process.env.NEXT_PUBLIC_APP_SIGNIN_URL);

/** Show "Needs verification" markers on unverified content. Defaults to on. */
export const contentReview = process.env.NEXT_PUBLIC_CONTENT_REVIEW !== 'false';

/** Search engines index the site only when a production URL is configured. */
export const indexable = siteUrl !== null;
