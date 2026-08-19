# Enable GitHub Pages (one-time)

The Phase 3 **build** succeeded. `actions/deploy-pages` then returned **404** because this repo has Pages off (`has_pages: false`). GitHub’s own message: enable Pages at the settings URL below.

This cannot be done from CI or a PR. You need **admin** on `NFernie/Katies-Adventures-2_Chapter-2`.

Walk-through script (opens the URLs):

```bash
bash scripts/wizard-github-pages.sh
```

## Clicks (GitHub docs: publishing with a custom Actions workflow)

1. Open [Pages settings](https://github.com/NFernie/Katies-Adventures-2_Chapter-2/settings/pages).
2. If there is no Settings tab: repo **⋯ → Settings** (you must be an admin).
3. Sidebar: **Code and automation → Pages**.
4. **Build and deployment → Source → GitHub Actions**.
5. **Skip** any workflow template GitHub suggests. This repo already has `.github/workflows/pages.yml`.
6. Do **not** choose “Deploy from a branch”.

Enabling Pages does not replay the failed run. Then:

7. Open [pages workflow runs](https://github.com/NFernie/Katies-Adventures-2_Chapter-2/actions/workflows/pages.yml).
8. Open the failed run on `main` → **Re-run failed jobs**.

When deploy is green, the project site is:

`https://nfernie.github.io/Katies-Adventures-2_Chapter-2/`

(`basePath` is already `/Katies-Adventures-2_Chapter-2`. Local: `http://localhost:3000/Katies-Adventures-2_Chapter-2/`.)

## What you should not do

- Do not add a second Pages workflow from GitHub’s template.
- Do not set Source to a branch (`gh-pages` / `docs/`).
- Do not put `service_role` or `USDA_FDC_API_KEY` in Pages env.

## If it still 404s after the re-run

- Wait a minute; first Pages provision can lag.
- Confirm the failed job was **deploy**, not **build**. If **build** is red, that is a different problem (lint/export).
- Org owners: check that Pages is allowed for this repo (org Settings → Pages).
