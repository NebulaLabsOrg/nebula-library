import { createInstance } from '../../../../../utils/src/http.utils.js';

import { edgexEnum } from './enum.js';

export { edgexEnum };

export class Edgex {
    constructor(_starkKeyPrv, _accountId, throttler = { enqueue: fn => fn() }) {
        this.account = {
            starkKeyPrv: _starkKeyPrv.startsWith('0x') ? _starkKeyPrv.slice(2) : _starkKeyPrv,
            accountId: _accountId
        };
        this.instance = createInstance('https://pro.edgex.exchange/api/v1');
        this.throttler = throttler;
    }

}