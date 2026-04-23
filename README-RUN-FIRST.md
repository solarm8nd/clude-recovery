# clude local recovery build

This archive now contains:

- the original extracted source tree
- a lightweight runtime bootstrap that injects the missing build-time macros
- a recovery launcher for source inspection
- a working terminal CLI bootstrap for the repaired local agent

## Windows quick start

```powershell
cd "C:\path\to\clude"
npm run agent
```

or

```powershell
bun .\bootstrap\runtime-cli.ts
```

## NPM scripts

```powershell
npm start
npm run doctor
npm run commands
npm run agent -- --help
npm run agent -- agents
```

## Notes

- `npm start` still opens the simple recovery launcher.
- `npm run agent` starts the repaired CLI bootstrap for the actual terminal agent.
- The original upstream build metadata/macros were incomplete in the archive, so local bootstrap and compatibility shims were added inside this same project to restore terminal startup.
