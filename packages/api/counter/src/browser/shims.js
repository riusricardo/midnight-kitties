// Browser environment shims
globalThis.process = globalThis.process || { env: {} };
globalThis.isNodeEnvironment = false;
globalThis.isBrowserEnvironment = true;