export class GrowthBook {
  constructor() {}
  init() { return Promise.resolve(); }
  loadFeatures() { return Promise.resolve(); }
  getFeatureValue(_key, fallback) { return fallback; }
  isOn() { return false; }
  setAttributes() {}
  setFeatures() {}
  subscribe() { return () => {}; }
  destroy() {}
}
export default { GrowthBook };
