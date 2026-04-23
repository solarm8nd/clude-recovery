# Source Doctor

## Current state
- Recovery agent boots: **yes**
- Original `src/main.tsx` clears the first package-resolution barrier: **yes**
- Original `src/main.tsx` fully boots end-to-end: **not yet**

## What changed
- Patched `bun:bundle` imports to `src/shims/bun-bundle.ts`
- Added public runtime dependencies to `package.json`
- Added local file-based stubs under `vendor-stubs/` for unavailable/private modules
- Added `package-lock.json`
- Added experimental source compatibility scripts:
  - `npm run source:main`
  - `npm run source:doctor`

## Last direct attempt
Command:
```bash
npx --yes tsx src/main.tsx
```

Observed behavior:
- no immediate `ERR_MODULE_NOT_FOUND`
- process stalled during startup for at least 8 seconds
- this means startup moved past the earliest resolver crashes, but the full original CLI still does not finish booting in this compatibility environment

## Recommended next steps
```bash
npm install
npm start
npm run source:main
npm run source:doctor
```

## Important note
This build is still a **compatibility/recovery fork around the uploaded source tree**.  
It pushes the original source farther toward booting, but it is not yet a faithful, fully-working upstream runtime.
