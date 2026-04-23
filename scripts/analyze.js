import { analyzeProject, writeAnalysisFiles } from '../recovery/tools.js';

const target = process.argv[2] || '.';
console.log(await analyzeProject(process.cwd(), target));
const written = await writeAnalysisFiles(process.cwd(), target);
console.log(`\nSaved analysis files:\n- ${written.markdown}\n- ${written.json}`);
