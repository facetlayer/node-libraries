# Changelog

## Unreleased
 - Added `apiFetch()` as a universal fetch with pluggable transport
 - Added `setFetchImplementation()` for setting custom fetch (e.g. in-process calls for Expo)
 - Added `configureWebFetch()` for setting a global base URL
 - Added Vite setup guide
 - Updated docs and tests to not use `/api` prefix in endpoint paths
 - Rewrote the README to match the current exports (removed stale references to `QueryProvider`, React Query, and Radix UI components; documented `webFetch` / `apiFetch` / `setFetchImplementation` / `configureWebFetch` / `cn`)
 - Fixed the Vite setup proxy example to target `/api` instead of `/`, matching the server's `/api/*` endpoint prefix

## 0.2.2

 - Initial changelog
