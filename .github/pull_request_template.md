## Summary

<!-- What does this PR do, and why? One or two sentences. -->

## Changes

<!-- The notable changes, as bullets. Skip the file-by-file listing — the diff shows that. -->

-

## How to test

<!-- Steps a reviewer can follow. Include the seed/env setup if this PR needs it. -->

1.

## Checklist

- [ ] `npm run build --workspace frontend` and `--workspace backend` pass
- [ ] `npm run lint` passes in both workspaces
- [ ] No `.env` file is committed (only `.env.example` belongs in git)
- [ ] Schema changes are mirrored on **both** sides (`backend/src/models` ↔ `frontend/src/types`)
- [ ] If `frontend/src/server/db/mock/tors.ts` changed: re-ran
      `cd frontend && npx tsx scripts/export-mock-tors.ts` and committed the
      regenerated `backend/src/seed/tors.seed.json`
- [ ] New user-facing text is in **both** `en.json` and `th.json`, or stored as
      `LocalizedText` when it is data rather than a UI label

## Screenshots

<!-- For UI changes. Include both light and dark theme if the change touches styling. -->