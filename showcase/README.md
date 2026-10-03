# showcase

kaushik.sh/projects/ reads this folder to show kaushik.sh. Keep it current whenever
the app's look, name or status changes, and bump `updated` when you do.
Contract: `~/Code/brain/design-system/INVARIANTS.md` → Portfolio.

- `showcase.json`: name, line (under 110 characters, for a stranger), url,
  url_label, repo (public repos only), public, updated.
- `light.png`, `dark.png`: 1280×800, the app's own content edge to edge.

## Regenerate

```sh
node showcase/shoot.mjs
```

Builds the live skin into a temp dir, serves it locally and shoots the home page in each colour scheme. The site is public, so its own content is the screenshot.
