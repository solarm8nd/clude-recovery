import MAGIC_PROXY, { createMagicProxy } from '../../recovery/magicProxy.js';

const __defaultExport: any = MAGIC_PROXY;
export default __defaultExport;

export type State = any;
export const State: any = createMagicProxy('State');
export type Warning = any;
export const Warning: any = createMagicProxy('Warning');
export type Workflow = any;
export const Workflow: any = createMagicProxy('Workflow');

export const __esModule = true;