import MAGIC_PROXY, { createMagicProxy } from '../../recovery/magicProxy.js';

const __defaultExport: any = MAGIC_PROXY;
export default __defaultExport;

export type SecureStorage = any;
export const SecureStorage: any = createMagicProxy('SecureStorage');
export type SecureStorageData = any;
export const SecureStorageData: any = createMagicProxy('SecureStorageData');

export const __esModule = true;