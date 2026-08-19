# FoodData Central API key (Phase 6)

The GitHub Pages app **never** calls USDA. Recipe macros are computed at write/CI time by `tools/nutrition/`. That script needs a **data.gov** API key.

**The catalog is not done until this key exists, enrich has run, and `npm run nutrition:check` is green.** Do not commit `data/recipes.json` with guessed kcal/protein.

## Run the wizard

```bash
bash scripts/wizard-usda-fdc.sh
```

It walks these stages:

1. Open [api.data.gov/signup](https://api.data.gov/signup/).
2. Submit name + email. **Do not use `DEMO_KEY`.**
3. Copy the key from the api.data.gov email.
4. Write `USDA_FDC_API_KEY` to gitignored `.env`.
5. Set GitHub Actions secret `USDA_FDC_API_KEY` (cache misses only).

Manual fallback: [FDC API guide](https://fdc.nal.usda.gov/api-guide.html) → Gaining Access → sign up.

## After the key is in `.env`

```bash
# Draft recipes with ingredient grams + fdcId (no macros yet)
npx tsx tools/nutrition/enrich.ts
npm run nutrition:check
```

- Key goes in `.env` / Actions secrets. **Never** `NEXT_PUBLIC_USDA_*`.
- `data/nutrition/fdc-cache.json` is committed after a real fetch so later CI can re-check without USDA on cache hits.
- Rotate the key if it ever appears in git.
