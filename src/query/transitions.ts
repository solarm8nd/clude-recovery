import MAGIC_PROXY, { createMagicProxy } from '../recovery/magicProxy.js';

const __defaultExport: any = MAGIC_PROXY;
export default __defaultExport;

export type Continue = any;
export const Continue: any = createMagicProxy('Continue');
export type Terminal = any;
export const Terminal: any = createMagicProxy('Terminal');

export const __esModule = true;