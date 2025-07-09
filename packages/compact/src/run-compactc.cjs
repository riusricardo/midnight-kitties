#!/usr/bin/env node

/**
 * @file run-compactc.cjs
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

const childProcess = require('child_process');
const path = require('path');

const [_node, _script, ...args] = process.argv;
const COMPACT_HOME_ENV = process.env.COMPACT_HOME;

let compactPath;
if (COMPACT_HOME_ENV != null) {
  compactPath = COMPACT_HOME_ENV;
  console.log(`'COMPACT_HOME' env variable is set; using Compact from ${compactPath}`);
} else {
  throw new Error(`'COMPACT_HOME' environment variable is not set`);
}

// yarn runs everything with node...
const child = childProcess.spawn(path.resolve(compactPath, 'compactc'), args, {
  stdio: 'inherit'
});
child.on('exit', (code, signal) => {
  if (code === 0) {
    process.exit(0);
  } else {
    process.exit(code ?? signal);
  }
})
