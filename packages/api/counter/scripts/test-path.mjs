#!/usr/bin/env node

// Simple test script to verify path resolution works correctly
import { contractConfig } from '@repo/counter-api';
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
