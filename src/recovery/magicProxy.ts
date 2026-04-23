export function createMagicProxy(label = "magic") {
  const fn = function magicCallable(...args) {
    return createMagicProxy(`${label}()`);
  };
  return new Proxy(fn, {
    get(_target, prop) {
      if (prop === Symbol.toPrimitive) return () => label;
      if (prop === 'toString') return () => `[MagicProxy ${label}]`;
      if (prop === 'valueOf') return () => label;
      if (prop === 'then') return undefined;
      return createMagicProxy(`${label}.${String(prop)}`);
    },
    apply() {
      return createMagicProxy(`${label}()`);
    },
    construct() {
      return createMagicProxy(`new ${label}`);
    }
  });
}

export const MAGIC_PROXY = createMagicProxy();
export default MAGIC_PROXY;
