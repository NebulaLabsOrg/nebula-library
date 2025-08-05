import { ExtendedScraper } from '../index.js';

/**
 * Make sure to install npx playwright install
 * If is used on a cloud service like Render, make sure to folllow the steps below:
 * - Build Command: npm install && npx playwright install
 * - Start Command: npm start
 * - Add the following environment variable:
 *   PLAYWRIGHT_BROWSERS_PATH=0
 */

const extendedScraper = new ExtendedScraper();

console.log('Get vault performance');
console.log('Calling: extendedScraper.getVaultPerformance');
const vaultPerformance = await extendedScraper.getVaultPerformance();
console.log(vaultPerformance);