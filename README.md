# RunHolic Web

Static site for race information (GitHub Pages).

## Publish
- Use GitHub Pages (public repo).
- Set Pages source to root ("/"), since files are in `web/`.
- URL shape: https://<username>.github.io/<repo>/

## Data
- `races.json` is the data source.
- Each race can optionally include `distances_km` for multiple courses.
- Use `registration_note` when registration is staged or differs by course.
- Update `version` and `updated_at` when you change race data.

## Build 2026 Dataset
- Source page: `https://www.endurohub.kr/races/year/2026`
- Generator: `node web/scripts/build_races_json.mjs`
- Offline mode from saved HTML:
  - `node web/scripts/build_races_json.mjs --input /tmp/endurohub-2026.html`
