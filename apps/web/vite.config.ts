/**
 * @file vite.config.ts
 * @author Ricardo Rius
 * @license GPL-3.0
 *
 * Copyright (C) 2025 Ricardo Rius
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * DISCLAIMER: This software is provided "as is" without any warranty.
 * Use at your own risk. The author assumes no responsibility for any
 * damages or losses arising from the use of this software.
 */

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
      include: ['@repo/kitties-api/**'],
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
    include: ['@repo/kitties-api'],
    exclude: ['@midnight-ntwrk/kitties-contract', 'node-fetch', 'fetch-blob', 'node-domexception'],
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
      // See: packages/api/kitties/src/browser/env-browser.ts for implementation details
      '@repo/kitties-api/src/env': '@repo/kitties-api/dist/browser/env-browser',
      '@repo/kitties-api/dist/env': '@repo/kitties-api/dist/browser/env-browser',
      '@repo/kitties-api/dist/env-node': '@repo/kitties-api/dist/browser/env-browser',
      '@repo/kitties-api/dist/node/env-node': '@repo/kitties-api/dist/browser/env-browser',
      './env-node.js': '@repo/kitties-api/dist/browser/env-browser',
      './env-node': '@repo/kitties-api/dist/browser/env-browser',
      '../node/env-node.js': '@repo/kitties-api/dist/browser/env-browser',
      // fs/promises is intentionally not polyfilled for browser
    },
  },
  define: {
    'process.env': {},
    global: 'window',
  },
});
