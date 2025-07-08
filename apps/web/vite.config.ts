import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import wasm from 'vite-plugin-wasm';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import inject from '@rollup/plugin-inject';
import stdLibBrowser from 'node-stdlib-browser';

// https://vitejs.dev/config/
export default defineConfig({
  cacheDir: './.vite',
  build: {
    target: 'esnext',
    minify: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      plugins: [
        inject({
          util: ['util', '*'],
          Buffer: ['buffer', 'Buffer'],
          process: 'process',
        }),
      ],
      external: [
        '@midnight-ntwrk/midnight-js-node-zk-config-provider',
        'fetch-blob',
        'node-domexception',
        'formdata-polyfill',
      ],
    },
  },
  plugins: [
    react(),
    viteCommonjs({
      include: ['@repo/counter-api/**'],
    }),
    wasm(),
    nodePolyfills({
      // Whether to polyfill specific Node.js globals
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill Node.js builtins
      protocolImports: true,
      include: ['util', 'buffer', 'events', 'path', 'querystring', 'url', 'fs', 'crypto', 'os'],
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis',
      },
    },
    include: ['@repo/counter-api'],
    exclude: ['@midnight-ntwrk/counter-contract', 'node-fetch', 'fetch-blob', 'node-domexception'],
  },
  resolve: {
    alias: {
      ...stdLibBrowser,
      // Additional specific aliases
      'node:util': stdLibBrowser.util,
      'node:buffer': stdLibBrowser.buffer,
      'node:fs': stdLibBrowser.fs,
      'node:crypto': stdLibBrowser.crypto,
      'node:path': stdLibBrowser.path,

      // Environment Abstraction Layer Aliases
      //
      // These aliases ensure that browser builds use browser-compatible implementations
      // instead of Node.js-specific code. The env-browser.ts file provides safe fallbacks
      // for file system operations and other Node.js APIs.
      //
      // See: packages/api/counter/src/browser/env-browser.ts for implementation details
      '@repo/counter-api/src/env': '@repo/counter-api/dist/browser/env-browser',
      '@repo/counter-api/dist/env': '@repo/counter-api/dist/browser/env-browser',
      '@repo/counter-api/dist/env-node': '@repo/counter-api/dist/browser/env-browser',
      '@repo/counter-api/dist/node/env-node': '@repo/counter-api/dist/browser/env-browser',
      './env-node.js': '@repo/counter-api/dist/browser/env-browser',
      './env-node': '@repo/counter-api/dist/browser/env-browser',
      '../node/env-node.js': '@repo/counter-api/dist/browser/env-browser',
      // fs/promises is intentionally not polyfilled for browser
    },
  },
  define: {
    'process.env': {},
    global: 'window',
  },
});
