// Web Worker for WebLLM with on-demand dynamic import
let handlerPromise: Promise<{ onmessage: (msg: MessageEvent) => void }> | null = null;

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = import('@mlc-ai/web-llm').then(({ WebWorkerMLCEngineHandler }) => {
      return new WebWorkerMLCEngineHandler();
    });
  }
  return handlerPromise;
}

self.onmessage = async (msg: MessageEvent) => {
  const handler = await getHandler();
  handler.onmessage(msg);
};
