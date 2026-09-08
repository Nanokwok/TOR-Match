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

## Screenshots

<!-- For UI changes. Include both light and dark theme if the change touches styling. -->