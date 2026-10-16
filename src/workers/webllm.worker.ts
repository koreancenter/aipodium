import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// Hook up the MLC engine to handle Web Worker messages
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
