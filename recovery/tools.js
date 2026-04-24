export async function planProject(cwd, target = '.') {
  const full = safeResolve(cwd, target);
  const report = await scanProject(full);
  return buildRepairPlan(report);
}