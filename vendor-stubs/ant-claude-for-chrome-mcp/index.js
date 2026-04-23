export function createClaudeForChromeMcpServer() {
  return { connect: async () => {}, close: async () => {} };
}
export async function runChromeNativeHost() {}
export default { createClaudeForChromeMcpServer, runChromeNativeHost };
