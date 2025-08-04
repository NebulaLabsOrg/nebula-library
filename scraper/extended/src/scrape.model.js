import { chromium } from 'playwright';
import { createResponse } from "../../../utils/src/response.utils.js";
import { fromAPRtoAPY, fromAPRtoROI30d } from './utils.js'

/**
 * @async
 * @function sGetVaultPerformance
 * @description Scrapes the specified URL to retrieve the "L30 Days APR" value for a vault, calculates ROI for 30 days, APR, and APY, and returns the results in a structured response object.
 * @param {string} _url - The URL of the page to scrape for vault performance data.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing vault address, 30-day ROI, APR, APY, or an error message.
 */
export async function sGetVaultPerformance(_url) {
    const labelToFind = 'L30 Days APR';
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0'
        });
        await page.goto(_url, { waitUntil: 'networkidle' });
        await page.waitForSelector(`text="${labelToFind}"`);

        const value = await page.evaluate((labelToFind) => {
            const el = Array.from(document.querySelectorAll('label, div, span'))
                .find(e => e.textContent.trim() === labelToFind);
            if (!el) return null;
            let sibling = el.nextElementSibling;
            if (sibling && /\d/.test(sibling.textContent)) return sibling.textContent.trim();
            return null;
        }, labelToFind);

        const apr = Number((value || '').replace(/[%\s]+/g, ''));
        return createResponse(
            true,
            'success',
            {
                vault: '0x7779Fea0755ce68b7EA096335144690Ed299b0C9',
                roi30d: fromAPRtoROI30d(apr || 0),
                apr,
                apy: fromAPRtoAPY(apr, 365) || 0,
            },
            'extendedScraper.getVaultPerformance'
        );
    } catch (error) {
        return createResponse(false, error.message, null, 'extendedScraper.getVaultPerformance');
    } finally {
        await browser.close();
    }
}