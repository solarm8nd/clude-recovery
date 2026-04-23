import { readState, writeState } from '../config.js';

export function getBridgeStatus() {
  const state = readState();
  return {
    enabled: Boolean(state.bridgeEnabled),
    reason: state.bridgeEnabled ? 'Bridge mode is enabled in .clude-recovery.json.' : 'Bridge mode is disabled in .clude-recovery.json.'
  };
}

export function setBridgeEnabled(enabled) {
  const state = readState();
  state.bridgeEnabled = Boolean(enabled);
  writeState(state);
  return getBridgeStatus();
}
