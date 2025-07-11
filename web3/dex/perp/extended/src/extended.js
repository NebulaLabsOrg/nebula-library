import { createInstance } from '../../../../../utils/src/http.utils.js';
import { createResponse } from '../../../../../utils/src/response.utils.js';
import { vmGetWalletStatus, vmGetWalletBalance, vmGetMarketData, vmGetLatestMarketData, vmGetMarketOrderSize, vmGetFundingRateHour, vmGetMarketOpenInterest, vmGetOpenPositions, vmGetOpenPositionDetail, vmGetOrderStatus } from './viewModel.js';
import { extendedEnum } from './enum.js';

export { extendedEnum };

export class Extended {
    constructor(_apiKey, throttler = { enqueue: fn => fn() }) {
        this.instance = createInstance('https://api.extended.exchange/api/v1', { 'X-Api-Key': _apiKey });
        this.throttler = throttler;
    }

    async getWalletStatus() {
        return this.throttler.enqueue(() => vmGetWalletStatus(this.instance));
    }

    async getWalletBalance() {
        return this.throttler.enqueue(() => vmGetWalletBalance(this.instance));
    }

    async getMarketData(_symbol) {
        return this.throttler.enqueue(() => vmGetMarketData(this.instance, _symbol));
    }

    async getLatestMarketData(_symbol) {
        return this.throttler.enqueue(() => vmGetLatestMarketData(this.instance, _symbol));
    }

    async getMarketOrderSize(_symbol) {
        return this.throttler.enqueue(() => vmGetMarketOrderSize(this.instance, _symbol));
    }

    async getFundingRateHour(_symbol) {
        return this.throttler.enqueue(() => vmGetFundingRateHour(this.instance, _symbol));
    }

    async getMarketOpenInterest(_symbol) {
        return this.throttler.enqueue(() => vmGetMarketOpenInterest(this.instance, _symbol));
    }

    async getOpenPositions() {
        return this.throttler.enqueue(() => vmGetOpenPositions(this.instance));
    }

    async getOpenPositionDetail(_symbol) {
        return this.throttler.enqueue(() => vmGetOpenPositionDetail(this.instance, _symbol));
    }

    async getOrderStatus(_orderId) {
        return this.throttler.enqueue(() => vmGetOrderStatus(this.instance, _orderId));
    }

    async test() {
        return this.throttler.enqueue(async () => {
            const response = await this.instance.get('/info/markets');
            return response.data;
        });
    }
}
