---
name: scrapegraph-content-ingest
description: "Use ScrapeGraphAI to ingest recipe and exercise content into the BodyPlan catalog. Apply only after a legal source review. Prefer licensed APIs and first-party seed data. Never scrape sites that forbid it, paywalled content, or personal data."
---

# ScrapeGraphAI content ingest

This project skill wraps [ScrapeGraphAI](https://github.com/ScrapeGraphAI/Scrapegraph-ai) for **offline catalog building**, not for runtime scraping inside the Next.js app.

## When to use

- A content source is **public, legally usable**, and has no ToS ban on automated extraction.
- You need to turn messy HTML (government nutrition pages, Creative Commons recipe collections, the product owner's own blog) into structured JSON that matches the Prisma `Recipe` / `Exercise` schema.
- A human or implementation agent will **review and seed** the output. Do not write scrape results straight to production.

## When not to use

- Allrecipes, NYT Cooking, BBC Good Food, Bodybuilding.com, or any commercial recipe/workout site without written permission.
- Anything behind a login, paywall, or CAPTCHA.
- Runtime generation of a user's daily meal plan (too slow, brittle, and legally risky).
- Copying copyrighted photos, full recipe method text, or branded workout programs.

Prefer these instead:

1. First-party seed JSON in `prisma/seed/`.
2. Licensed APIs (USDA FoodData Central, Spoonacular, Edamam, wger.de).
3. Manual admin CRUD.

## Install (local tooling only)

```bash
python3 -m venv .venv-scrape
source .venv-scrape/bin/activate
pip install scrapegraphai
playwright install
```

Keep this virtualenv out of the Next.js runtime. Add `.venv-scrape/` to `.gitignore`.

## Output contract

Every scrape job must emit JSON that can be upserted by Prisma:

```json
{
  "recipes": [
    {
      "slug": "greek-yogurt-berry-bowl",
      "title": "Greek yogurt berry bowl",
      "mealTypes": ["breakfast", "snack"],
      "servings": 1,
      "kcal": 320,
      "proteinG": 28,
      "carbG": 32,
      "fatG": 8,
      "minutes": 10,
      "tags": ["high-protein", "vegetarian", "no-cook"],
      "ingredients": [{ "name": "0% Greek yogurt", "grams": 200 }],
      "steps": ["Add yogurt to a bowl.", "Top with berries and honey."],
      "sourceUrl": "https://example.gov/...",
      "license": "public-domain",
      "reviewed": false
    }
  ],
  "exercises": [
    {
      "slug": "goblet-squat",
      "name": "Goblet squat",
      "pattern": "squat",
      "equipment": ["dumbbell"],
      "level": "beginner",
      "primaryMuscles": ["quads", "glutes"],
      "cues": ["Elbows inside knees.", "Heels stay down."],
      "sourceUrl": "https://example.org/...",
      "license": "cc-by-4.0",
      "reviewed": false
    }
  ]
}
```

## Pipeline

1. Confirm the source is allowed. Record the decision in `docs/content-sources.md`.
2. Run a single-page `SmartScraperGraph` with an explicit JSON schema in the prompt.
3. Validate calories/macros with a checksum (protein×4 + carb×4 + fat×9 ≈ kcal ±15%).
4. Mark `reviewed: false`.
5. Open a PR with the JSON. Do not auto-merge.
6. After human or dietitian review, seed via Prisma.

## Example prompt for SmartScraperGraph

```text
Extract only recipes that list ingredients with quantities and a method.
Return JSON matching { title, ingredients[{name, quantity, unit}], steps[], servings }.
Skip sponsored lists, videos without a written recipe, and nutrition claims.
```

## Safety

- Set `SCRAPEGRAPHAI_TELEMETRY_ENABLED=false` if the owner opts out.
- Do not store API keys in the repo. Use environment variables.
- Rate-limit. One source domain per job.
- If the page forbids scraping, stop and switch to an API or manual entry.
