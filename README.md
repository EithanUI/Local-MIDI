# Local MIDI

Local MIDI is a browser-only, installable MIDI editor for sketching ideas in a 128-note piano roll. Notes are kept in memory in the current page; they are not uploaded or saved between visits. MIDI export is generated locally by your browser. Install only from the project's trusted HTTPS site using **Get the app** or your browser's install/add-to-home-screen menu. The app shell is cached for offline use; patterns themselves are not saved.

## Publish with GitHub Pages

1. Commit the app files and `.github/workflows/deploy-pages.yml` to the `main` branch.
2. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
3. Push to `main` or run **Deploy to GitHub Pages** from the Actions tab. The deployment URL appears in the workflow run and the `github-pages` environment.

The workflow publishes only the app shell, manifest, worker, and icons. The app has no backend, account system, analytics, external assets, or network APIs. Anyone with the site URL can use it, but each visitor's patterns remain in their own browser session. The service worker caches only the named app-shell assets and falls back to the editor for offline navigation.
