/**
 * Runs once when the Next.js server starts. Registers AI SDK DevTools so every
 * extraction call is captured for inspection, then loads the registered
 * integrations lazily to keep them out of the production bundle.
 */
export const register = async () => {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const { registerAiDevTools } = await import("./lib/ai/devtools");
  registerAiDevTools();
};
