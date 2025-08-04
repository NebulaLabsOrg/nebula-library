import { chromium } from 'playwright';
import { createResponse } from "../../../utils/src/response.utils.js";
import { fromAPYtoAPR, fromAPRtoROI30d } from './utils.js'

/**
 * @async
 * @function sGetVaultPerformance
 * @description Scrapes the provided URL to extract the APY value for the Defx Liquidity Engine vault. The function waits for the APY element to be loaded and ensures the value is valid before proceeding. It then calculates the APR and 30-day ROI based on the APY, and returns a structured response object with the vault performance data or an error message if scraping fails.
 * @param {string} _url - The URL of the page to scrape for vault APY performance data.
 * @returns {Promise<Object>} A Promise that resolves to a response object containing vault name, address, 30-day ROI, APR, APY, or an error message if the operation fails.
 */
export async function sGetVaultPerformance(_url) {
    const browser = await chromium.launch({ headless: false });
    try {
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0',
        });
        await page.goto(_url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for the APY container to be present
        await page.waitForSelector('div.flex-1.d-flex.flex-column', { timeout: 60000 });

        // Polling every 100 ms, max 2s, until APY value is not "0", "0.00" or empty
        const timeout = 2000;
        const pollingInterval = 100;
        const maxTries = timeout / pollingInterval;
        let tries = 0;
        let value = "0";

        while (tries < maxTries) {
            value = await page.evaluate(() => {
                const blocks = document.querySelectorAll('div.flex-1.d-flex.flex-column');
                for (const block of blocks) {
                    const labelSpan = block.querySelector('span.font-s5.color-light');
                    if (labelSpan && labelSpan.textContent.trim().toUpperCase() === 'APY') {
                        const valueSpan = block.querySelector('span.font-s1.text-bold.color-hint.v-align-middle.color-green');
                        if (valueSpan) {
                            const cleaned = valueSpan.textContent.replace(/[^0-9.]/g, '').trim();
                            return cleaned ? cleaned : "0";
                        }
                    }
                }
                return "0";
            });
            if (value !== "0" && value !== "" && value !== "0.00") break;
            await new Promise(res => setTimeout(res, pollingInterval));
            tries++;
        }

        if (tries === maxTries) {
            return createResponse(false, 'Scraping failed to retrieve APY value', null, 'defxScraper.getVaultPerformance');
        }

        await browser.close();

        // You need to implement fromAPYtoAPR or import it if available
        const apy = parseFloat(value) || 0;
        const apr = fromAPYtoAPR(apy, 365);
        return createResponse(
            true,
            'success',
            {
                vault: 'Defx Liquidity Engine',
                address: 'none',
                roi30d: fromAPRtoROI30d(apr || 0),
                apr: apr,
                apy: apy,
            },
            'defxScraper.getVaultPerformance'
        );
    } catch (error) {
        return createResponse(false, error.message, null, 'defxScraper.getVaultPerformance');
    } finally {
        await browser.close();
    }
}