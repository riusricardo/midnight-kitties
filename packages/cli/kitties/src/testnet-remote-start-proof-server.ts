/**
 * @file testnet-remote-start-proof-server.ts
 * @license GPL-3.0
 *
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
 */

import { run } from './cli.js';
import { currentDir, TestnetRemoteConfig, createLogger } from '@repo/kitties-api';
import { DockerComposeEnvironment, Wait } from 'testcontainers';
import path from 'node:path';

const config = new TestnetRemoteConfig();
const dockerEnv = new DockerComposeEnvironment(
  path.resolve(currentDir, '..'),
  'proof-server-testnet.yml',
).withWaitStrategy('proof-server', Wait.forLogMessage('Actix runtime found; starting in Actix runtime', 1));
const logger = await createLogger(config.logDir);
await run(config, logger, dockerEnv);
