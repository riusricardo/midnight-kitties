/**
 * @file retry-with-backoff.ts
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

import { type Logger } from 'pino';

export function retryWithBackoff<T>(
  operation: () => Promise<T>, // The promise-returning operation
  operationName: string, // Name of the operation for logging
  logger: Logger,
  retries: number = 10, // Number of retries
  delay: number = 500, // Initial delay in milliseconds
  backoffFactor: number = 1.2, // Backoff factor
  maxDelay: number = 30000, // Maximum delay in milliseconds
): Promise<T> {
  return new Promise((resolve, reject) => {
    const attempt: (retryCount: number, currentDelay: number, isRetry: boolean) => void = (
      retryCount: number,
      currentDelay: number,
      isRetry: boolean,
    ) => {
      operation()
        .then((result) => {
          if (isRetry) {
            logger.info(`[${operationName}] Operation succeeded after retries.`);
          }
          resolve(result);
        })
        .catch((error) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          logger.error(`[${operationName}] Operation failed: ${error.message}`);

          if (retryCount <= 0) {
            logger.error(`[${operationName}] All retries exhausted. Rejecting.`);
            reject(error);
          } else {
            logger.info(`[${operationName}] Retrying operation in ${currentDelay}ms...`);
            setTimeout(() => {
              const nextDelay = Math.min(currentDelay * backoffFactor, maxDelay);
              attempt(retryCount - 1, nextDelay, true);
            }, currentDelay);
          }
        });
    };

    // Start the first attempt (not considered a retry initially)
    attempt(retries, delay, false);
  });
}
