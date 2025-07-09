#!/usr/bin/env node

/**
 * @file test-path.mjs
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

// Simple test script to verify path resolution works correctly
import { contractConfig } from '@repo/kitties-api';
import { existsSync } from 'fs';
import { join } from 'path';

console.log('=== Testing Path Resolution ===');
console.log('Current working directory:', process.cwd());
console.log('Resolved zkConfigPath:', contractConfig.zkConfigPath);

// Test if the path exists and contains the expected files
const keysPath = join(contractConfig.zkConfigPath, 'keys');
const verifierPath = join(keysPath, 'increment.verifier');

console.log('\n=== Path Verification ===');
console.log('zkConfigPath exists:', existsSync(contractConfig.zkConfigPath));
console.log('keys directory exists:', existsSync(keysPath));
console.log('increment.verifier exists:', existsSync(verifierPath));

if (existsSync(verifierPath)) {
  console.log('✅ Path resolution is working correctly!');
} else {
  console.log('❌ Path resolution failed!');
  console.log('Expected verifier file at:', verifierPath);
}
