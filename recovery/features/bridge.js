import { readState, writeState } from '../config.js';

export function getBridgeStatus(rootDir = process.cwd()) {
  const state = readState(rootDir);
  return {
    enabled: Boolean(state.bridgeEnabled),
    reason: state.bridgeEnabled ? 'Bridge mode is enabled in .clude-recovery.json.' : 'Bridge mode is disabled in .clude-recovery.json.'
  };
}

export function setBridgeEnabled(enabled, rootDir = process.cwd()) {
  const state = readState(rootDir);
  state.bridgeEnabled = Boolean(enabled);
  writeState(state, rootDir);
  return getBridgeStatus(rootDir);
}
