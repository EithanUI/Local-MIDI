# LocalMIDI

A browser-only, installable MIDI piano roll. Notes are kept in memory in the current page; they are not uploaded or saved between visits. MIDI export is generated locally by your browser. After opening the HTTPS site, use **Install app** or your browser's install/add-to-home-screen menu. The app shell is cached for offline use; patterns themselves are not saved.

## Publish with GitHub Pages

1. Commit the app files and `.github/workflows/deploy-pages.yml` to the `main` branch.
2. In the repository, open **Settings → Pages** and set the build and deployment source to **GitHub Actions**.
3. Push to `main` or run **Deploy to GitHub Pages** from the Actions tab. The deployment URL appears in the workflow run and the `github-pages` environment.

The workflow publishes only the app shell, manifest, worker, and icons. The app has no backend, account system, analytics, external assets, or network APIs. Anyone with the site URL can use it, but each visitor's patterns remain in their own browser session.
