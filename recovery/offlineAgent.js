import { analyzeProject, renderAnalysisReport } from './projectAnalysis.js';
import { doctor } from './tools.js';

function wantsProjectAnalysis(text) {
  return /(analy[sz]e|analysis|project|repo|repository|architecture|entrypoint|انلسيز|حلل|تحليل|البروجكت|المشروع|الملفات)/i.test(text);
}

function wantsPlan(text) {
  return /(plan|roadmap|fix|repair|strategy|خطة|اصلح|إصلاح|حل)/i.test(text);
}

function wantsDoctor(text) {
  return /(doctor|diagnos|تشخيص|شخّص|شخص)/i.test(text);
}

export async function answerOfflineQuery(cwd, text) {
  if (wantsDoctor(text) && !wantsProjectAnalysis(text)) {
    return doctor(cwd);
  }

  if (wantsProjectAnalysis(text) || wantsPlan(text)) {
    const report = await analyzeProject(cwd);
    return renderAnalysisReport(report);
  }

  return [
    'No local model is configured, so the agent is in offline recovery mode.',
    'Available offline work:',
    '- analyze the project',
    '- inspect files and directories',
    '- run /doctor',
    '- use /ls, /read, /search, /shell',
    '',
    'Example:',
    '- حلل المشروع',
    '- analyze this project',
    '- اعمل خطة اصلاح'
  ].join('\n');
}
