import { ec, hash } from "starknet";
import Decimal from 'decimal.js';
import { vmGetMarketData } from './view.model.js';
import { extendedEnum } from './enum.js';

/**
 * @async
 * @function getSignatureData
 * @description Calculates and returns the necessary data for signing a perpetual order on a synthetic market. This includes asset IDs, amounts (synthetic and collateral), fee, position ID, and expiration timestamp, based on the provided order parameters and market configuration.
 * @param {Object} _instance - The API client or contract instance used to fetch market data.
 * @param {string} _symbol - The market symbol for which the order is being placed.
 * @param {string} _side - The order side, indicating whether the position is long or short.
 * @param {string|number} _qty - The quantity of the synthetic asset to trade.
 * @param {string|number} _price - The price at which the order is placed.
 * @param {string|number} _fee - The fee rate applied to the order.
 * @param {string|number} _vaultNr - The vault or position identifier.
 * @param {number} _expiryEpochMillis - The expiration timestamp in milliseconds since epoch.
 * @returns {Promise<Object>} A Promise that resolves to an object containing signature data required for order submission.
 */
async function getSignatureData(_instance, _symbol, _side, _qty, _price, _fee, _vaultNr, _expiryEpochMillis) {
    const marketData = await vmGetMarketData(_instance, _symbol);
    const { l2Config } = marketData.data[0];

    const isBuyingSynthetic = _side === extendedEnum.order.long;

    let amountSynthetic, amountCollateral, maxFee;

    if (isBuyingSynthetic) {
        amountSynthetic = BigInt(
            new Decimal(_qty)
                .mul(new Decimal(l2Config.syntheticResolution))
                .ceil()
                .toString()
        );
        amountCollateral = BigInt(
            new Decimal(_qty)
                .mul(new Decimal(_price))
                .mul(new Decimal(l2Config.collateralResolution))
                .ceil()
                .toString()
        );
    } else {
        amountSynthetic = BigInt(
            new Decimal(_qty)
                .mul(new Decimal(l2Config.syntheticResolution))
                .floor()
                .toString()
        );
        amountCollateral = BigInt(
            new Decimal(_qty)
                .mul(new Decimal(_price))
                .mul(new Decimal(l2Config.collateralResolution))
                .floor()
                .toString()
        );
    }

    maxFee = BigInt(
        new Decimal(_qty)
            .mul(new Decimal(_price))
            .mul(new Decimal(_fee))
            .mul(new Decimal(l2Config.collateralResolution))
            .ceil()
            .toString()
    );

    return {
        assetIdSynthetic: l2Config.syntheticId,
        assetIdCollateral: l2Config.collateralId,
        assetIdFee: l2Config.collateralId,
        isBuyingSynthetic: isBuyingSynthetic,
        amountSynthetic,
        amountCollateral,
        maxFee,
        positionId: BigInt(_vaultNr),
        expirationTimestamp: BigInt(Math.floor(_expiryEpochMillis / 1000))
    }
}

/**
 * @function getOrderMsg
 * @description Generates a unique order message hash for a synthetic asset trade, packing all relevant order parameters and computing a Pedersen hash for secure identification. The function supports both buy and sell orders, and encodes asset IDs, amounts, fees, nonce, position ID, and expiration into the hash.
 * @param {string|number|bigint} _assetIdSynthetic - The ID of the synthetic asset involved in the trade.
 * @param {string|number|bigint} _assetIdCollateral - The ID of the collateral asset involved in the trade.
 * @param {boolean} _isBuyingSynthetic - Indicates whether the synthetic asset is being bought (true) or sold (false).
 * @param {string|number|bigint} _assetIdFee - The ID of the asset used for paying fees.
 * @param {string|number|bigint} _amountSynthetic - The amount of synthetic asset to buy or sell.
 * @param {string|number|bigint} _amountCollateral - The amount of collateral asset to buy or sell.
 * @param {string|number|bigint} _maxFee - The maximum fee allowed for the order.
 * @param {string|number|bigint} _nonce - A unique nonce to prevent replay attacks.
 * @param {string|number|bigint} _positionId - The position ID associated with the order.
 * @param {string|number|bigint} _expirationHours - The number of hours until the order expires.
 * @returns {bigint} The computed Pedersen hash representing the order message.
 */
function getOrderMsg(_assetIdSynthetic, _assetIdCollateral, _isBuyingSynthetic, _assetIdFee, _amountSynthetic, _amountCollateral, _maxFee, _nonce, _positionId, _expirationHours) {
    let assetIdSell, assetIdBuy, amountSell, amountBuy;
    if (_isBuyingSynthetic) {
        assetIdSell = _assetIdCollateral;
        assetIdBuy = _assetIdSynthetic;
        amountSell = _amountCollateral;
        amountBuy = _amountSynthetic;
    } else {
        assetIdSell = _assetIdSynthetic;
        assetIdBuy = _assetIdCollateral;
        amountSell = _amountSynthetic;
        amountBuy = _amountCollateral;
    }

    let msg = hash.computePedersenHash(BigInt(assetIdSell), BigInt(assetIdBuy));
    msg = hash.computePedersenHash(msg, BigInt(_assetIdFee));

    let packed0 = BigInt(amountSell);
    packed0 = packed0 * 2n ** 64n + BigInt(amountBuy);
    packed0 = packed0 * 2n ** 64n + BigInt(_maxFee);
    packed0 = packed0 * 2n ** 32n + BigInt(_nonce);
    msg = hash.computePedersenHash(msg, packed0);

    let packed1 = 3n;
    packed1 = packed1 * 2n ** 64n + BigInt(_positionId);
    packed1 = packed1 * 2n ** 64n + BigInt(_positionId);
    packed1 = packed1 * 2n ** 64n + BigInt(_positionId);
    packed1 = packed1 * 2n ** 32n + BigInt(_expirationHours);
    packed1 = packed1 * 2n ** 17n;
    msg = hash.computePedersenHash(msg, packed1);

    return msg;
}

/**
 * @function ensureHexPrivateKey
 * @description Converts a given private key to a hexadecimal string prefixed with "0x". Accepts private keys as bigint, number, or string. If the input is a decimal string, it is converted to hexadecimal. If the input is a hexadecimal string without the "0x" prefix, the prefix is added. If the input already starts with "0x", it is returned as is.
 * @param {bigint|number|string} privateKey - The private key to be converted to hexadecimal format.
 * @returns {string|undefined} The private key as a hexadecimal string prefixed with "0x", or undefined if the input type is not supported.
 */
function ensureHexPrivateKey(privateKey) {
    if (typeof privateKey === "bigint" || typeof privateKey === "number") {
        return "0x" + BigInt(privateKey).toString(16);
    }
    if (typeof privateKey === "string") {
        if (!privateKey.startsWith("0x")) {
            if (/^\d+$/.test(privateKey)) return "0x" + BigInt(privateKey).toString(16);
            if (/^[a-fA-F0-9]+$/.test(privateKey)) return "0x" + privateKey;
        }
        return privateKey;
    }
}

/**
 * @async
 * @function signSettlement
 * @description Signs a settlement order for a perp DEX contract, generating the cryptographic signature and Stark public key required for on-chain validation. Uses the order data and provided keys to create an order hash and sign it. Returns the signature, Stark key, collateralized position ID, and order hash.
 * @param {Object} _instance - Instance of the client or provider used to obtain signature data.
 * @param {string} _symbol - Market symbol for the settlement.
 * @param {boolean} _side - Indicates whether the operation is a buy (true) or sell (false).
 * @param {bigint|string|number} _qty - Quantity of the synthetic asset to trade.
 * @param {bigint|string|number} _price - Price of the synthetic asset.
 * @param {bigint|string|number} _fee - Maximum fee allowed for the order.
 * @param {number|string|bigint} _vaultNr - Identifier number of the collateralized vault.
 * @param {number|string|bigint} _nonce - Unique number to prevent order replay.
 * @param {number|string|bigint} _expiryEpochMillis - Expiration timestamp of the order in milliseconds (epoch).
 * @param {string} _privateKey - User's private key in hexadecimal format.
 * @param {string} [_publicKey] - (Optional) User's Stark public key in hexadecimal format.
 * @returns {Promise<Object>} Promise resolving to an object containing the signature, Stark key, collateralized position ID, and order hash.
 */
export async function signSettlement(_instance, _symbol, _side, _qty, _price, _fee, _vaultNr, _nonce, _expiryEpochMillis, _privateKey, _publicKey) {
    const bufferSeconds = 14n * 24n * 60n * 60n; //non sure if needed
    const expirationTimestamp = BigInt(Math.floor(_expiryEpochMillis / 1000));
    const expiryWithBuffer = BigInt(expirationTimestamp) + bufferSeconds;
    const expirationHours = BigInt(Math.ceil(Number(expiryWithBuffer) / 3600));

    const signatureData = await getSignatureData(
        _instance,
        _symbol,
        _side,
        _qty,
        _price,
        _fee,
        _vaultNr,
        _expiryEpochMillis
    )

    const orderHash = getOrderMsg(
        signatureData.assetIdSynthetic,
        signatureData.assetIdCollateral,
        signatureData.isBuyingSynthetic,
        signatureData.assetIdFee,
        signatureData.amountSynthetic,
        signatureData.amountCollateral,
        signatureData.maxFee,
        _nonce,
        signatureData.positionId,
        expirationHours
    );

    const privKeyHex = ensureHexPrivateKey(_privateKey);

    const signature = ec.starkCurve.sign(orderHash, privKeyHex);

    const starkKeyHex = _publicKey
        ? _publicKey
        : "0x" + ec.starkCurve.getStarkKey(privKeyHex).toString(16);

    return {
        signature: {
            r: '0x' + signature.r.toString(16),
            s: '0x' + signature.s.toString(16),
        },
        starkKey: starkKeyHex,
        collateralPosition: signatureData.positionId.toString(),
        orderHash: '0x' + orderHash.toString(16),
    };
}
