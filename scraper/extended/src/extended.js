import { chromium } from 'playwright';
import { createResponse } from "../../../utils/src/response.utils.js";
import { fromAPRtoAPY, fromAPRtoROI30d } from './utils.js'

export class ExtendedScraper {
    constructor() {
        this.url = {
            vault: 'https://app.extended.exchange/vault'
        };
    }

    async getVaultPerformance() {
        const labelText = 'L30 Days APR';
        const browser = await chromium.launch({ headless: true });
        try {
            const page = await browser.newPage();
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0'
            });
            await page.goto(this.url.vault, { waitUntil: 'networkidle' });
            await page.waitForSelector(`text="${labelText}"`);

            const value = await page.evaluate((labelText) => {
                const el = Array.from(document.querySelectorAll('label, div, span'))
                    .find(e => e.textContent.trim() === labelText);
                if (!el) return null;
                let sibling = el.nextElementSibling;
                if (sibling && /\d/.test(sibling.textContent)) return sibling.textContent.trim();
                return null;
            }, labelText);

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
}
