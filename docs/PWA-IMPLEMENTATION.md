# ViLek PWA implementation

## Included in this milestone

- Web app manifest and ViLek launcher icons.
- Next.js metadata for installability and iOS Home Screen presentation.
- Production-only service worker registration.
- Install prompt for browsers that expose `beforeinstallprompt`.
- iOS Safari Home Screen installation guidance.
- Online/offline status indicator.
- User-controlled service-worker update activation.
- Static offline fallback page.

## Security and caching policy

The service worker intentionally does **not** cache authenticated HTML, API responses,
login/authentication routes, uploaded files, receipts, bank details, payment data, MFA
secrets or other user-specific content. It only caches content-hashed Next.js build
assets and a small public offline shell (manifest and app icons).

The offline page explains that ViLek requires a connection to load account data and
perform business actions. This milestone does not implement offline expense drafts,
queued transactions or background synchronization.

## Deployment requirements

1. Serve ViLek over HTTPS in production. Service workers and PWA installation require
   a secure context (localhost is permitted for development testing).
2. Deploy the `public/manifest.webmanifest`, `public/sw.js`, `public/offline.html` and
   `public/icons/` files with the Next.js application.
3. Verify that `/manifest.webmanifest`, `/sw.js`, `/offline.html` and all three icon
   URLs return HTTP 200 from the production host.
4. Ensure the reverse proxy/CDN does not cache `sw.js` for a long time. The client
   registers it with `updateViaCache: "none"`; serving it with `Cache-Control: no-cache`
   is also recommended.
5. Confirm the deployment permits the service worker at `/sw.js` to use scope `/`.
6. After a future service-worker cache-policy change, increment `CACHE_NAME` in
   `public/sw.js` so old static caches are cleaned up on activation.

## Testing checklist

- Chrome/Edge desktop: install prompt appears when browser installability criteria are met.
- Android Chrome: install ViLek and confirm it opens in standalone display mode.
- iPhone/iPad Safari: use Share → Add to Home Screen; launch the installed icon.
- Confirm login, OIDC redirects, MFA, logout and session expiry still work.
- Confirm camera/file inputs and receipt uploads still work online.
- Disable network and navigate: the offline fallback appears; private pages are not
  served from cache.
- Re-enable network and reload: ViLek loads normally.
- Deploy a new service-worker version: the update banner offers a controlled refresh.

## Local development

The service worker is registered only when `NODE_ENV === "production"` so it does not
interfere with Next.js hot reload during normal development. Test installation using a
production build (`npm run build` followed by `npm run start`) on localhost or HTTPS.
