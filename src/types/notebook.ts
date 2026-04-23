import MAGIC_PROXY, { createMagicProxy } from '../recovery/magicProxy.js';

const __defaultExport: any = MAGIC_PROXY;
export default __defaultExport;

export type NotebookCell = any;
export const NotebookCell: any = createMagicProxy('NotebookCell');
export type NotebookCellType = any;
export const NotebookCellType: any = createMagicProxy('NotebookCellType');
export type NotebookContent = any;
export const NotebookContent: any = createMagicProxy('NotebookContent');

export const __esModule = true;