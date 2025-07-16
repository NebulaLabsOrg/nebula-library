import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';
import { vmGetMarketOrderSize, vmGetMarketData, vmGetLatestMarketData } from './view.model.js';
import { formatOrderQuantity, calculateMidPrice, generateNonce } from './utils.js';
import { signSettlement } from './test.js';
import { extendedEnum } from './enum.js';
import { DAY_MS, marketTimeInForce, limitTimeInForce } from './constant.js';
import Decimal from 'decimal.js';

// --- ENUMS (as in StarkEx SDK) ---
const SIDE_ENUM = { BUY: 0, SELL: 1 };

export async function wmSubmitOrder(_instance, _chainId, _account, _type, _symbol, _side, _marketUnit, _orderQty) {
  try {
    // 1. Get fees
    const feeParams = { market: _symbol };
    const urlFeeData = encodeGetUrl('/user/fees', feeParams);
    const feeDataResponce = await _instance.get(urlFeeData);
    const { makerFeeRate, takerFeeRate } = feeDataResponce.data.data[0];
    console.debug("makerFeeRate, takerFeeRate:", makerFeeRate, takerFeeRate);

    // 2. Get market size
    const marketSize = await vmGetMarketOrderSize(_instance, _symbol);
    if (!marketSize.success) {
      console.error("marketSize error:", marketSize);
      return createResponse(false, marketSize.message, null, 'extended.submitOrder');
    }
    console.debug("marketSize:", marketSize);

    // 3. Get market decimals & asset ids from l2Config
    const marketData = await vmGetMarketData(_instance, _symbol);
    if (!marketData.success) {
      console.error("marketData error:", marketData);
      return createResponse(false, marketData.message, null, 'extended.submitOrder');
    }
    const {
      l2Config
    } = marketData.data[0];
    if (!l2Config?.syntheticId || !l2Config?.collateralId) {
      console.error("l2Config missing ids:", l2Config);
      return createResponse(false, "Market data missing syntheticId or collateralId", null, 'extended.submitOrder');
    }
    const assetIdSynthetic = l2Config.syntheticId; // stringa esadecimale
    const assetIdCollateral = l2Config.collateralId;
    const assetIdFee = assetIdCollateral; // di solito coincide
    console.debug("assetIdSynthetic:", assetIdSynthetic, "assetIdCollateral:", assetIdCollateral, "assetIdFee:", assetIdFee);

    // 4. Get latest market price
    const latestMarketData = await vmGetLatestMarketData(_instance, _symbol);
    if (!latestMarketData.success) {
      console.error("latestMarketData error:", latestMarketData);
      return createResponse(false, latestMarketData.message, null, 'extended.submitOrder');
    }
    const { askPrice, bidPrice } = latestMarketData.data;
    const midPrice = calculateMidPrice(askPrice, bidPrice);
    console.debug("askPrice, bidPrice, midPrice:", askPrice, bidPrice, midPrice);

    // 5. Calculate quantum qty
    const qty = formatOrderQuantity(
      _orderQty,
      _marketUnit === extendedEnum.order.quoteOnSecCoin,
      midPrice,
      marketSize.data.qtyStep
    );
    console.debug("qty:", qty, "minQty:", marketSize.data.minQty);

    if (parseFloat(qty) < marketSize.data.minQty) {
      console.error("Order quantity too low:", qty, "<", marketSize.data.minQty);
      return createResponse(false, `Order quantity must be greater than ${marketSize.data.minQty}`, null, 'extended.submitOrder');
    }

    // 6. Quantum and fee conversion (debug ogni valore!)
    const resolutionSynthetic = l2Config.syntheticResolution;
    const resolutionCollateral = l2Config.collateralResolution;
    console.debug("resolutionSynthetic:", resolutionSynthetic, "resolutionCollateral:", resolutionCollateral);

    let amountSynthetic, amountCollateral, maxFee;
    const isBuyingSynthetic = (_side === "BUY" || _side === SIDE_ENUM.BUY);

    try {
      if (isBuyingSynthetic) {
        amountSynthetic = BigInt(
          new Decimal(qty)
            .mul(new Decimal(resolutionSynthetic))
            .ceil()
            .toString()
        );
        amountCollateral = BigInt(
          new Decimal(qty)
            .mul(new Decimal(midPrice))
            .mul(new Decimal(resolutionCollateral))
            .ceil()
            .toString()
        );
      } else {
        amountSynthetic = BigInt(
          new Decimal(qty)
            .mul(new Decimal(resolutionSynthetic))
            .floor()
            .toString()
        );
        amountCollateral = BigInt(
          new Decimal(qty)
            .mul(new Decimal(midPrice))
            .mul(new Decimal(resolutionCollateral))
            .floor()
            .toString()
        );
      }

      maxFee = BigInt(
        new Decimal(qty)
          .mul(new Decimal(midPrice))
          .mul(new Decimal(takerFeeRate))
          .mul(new Decimal(resolutionCollateral))
          .ceil()
          .toString()
      );
    } catch (e) {
      console.error("Error computing BigInt amounts. qty, midPrice, takerFeeRate:", qty, midPrice, takerFeeRate, e);
      return createResponse(false, "Error computing order amounts: " + e.message, null, 'extended.submitOrder');
    }
    console.debug("amountSynthetic:", amountSynthetic, "amountCollateral:", amountCollateral, "maxFee:", maxFee);

    // Nonce e posizione
    let nonce, positionId;
    try {
      nonce = BigInt(generateNonce());
      positionId = BigInt(_account.vaultNr);
    } catch (e) {
      console.error("Error computing nonce or positionId:", nonce, positionId, e);
      return createResponse(false, "Error with nonce or positionId: " + e.message, null, 'extended.submitOrder');
    }
    console.debug("nonce:", nonce, "positionId:", positionId);

    // Expiry in secondi per la firma, in ms per il body
    const expiryEpochMillis = Date.now() + DAY_MS; // esempio: 1 giorno dopo ora
    let expirationTimestamp;
    try {
      expirationTimestamp = BigInt(Math.floor(expiryEpochMillis / 1000));
    } catch (e) {
      console.error("Error computing expirationTimestamp:", expiryEpochMillis, e);
      return createResponse(false, "Error with expirationTimestamp: " + e.message, null, 'extended.submitOrder');
    }
    console.debug("expirationTimestamp:", expirationTimestamp, "expiryEpochMillis:", expiryEpochMillis);

    // 7. Firma settlement
    let settlement;
    try {
      settlement = signSettlement({
        privateKey: _account.starkKeyPrv,
        publicKey: _account.starkKeyPub, // opzionale
        assetIdSynthetic,
        assetIdCollateral,
        assetIdFee,
        isBuyingSynthetic,
        amountSynthetic,
        amountCollateral,
        maxFee,
        nonce,
        positionId,
        expirationTimestamp
      });
    } catch (e) {
      console.error("Error in signSettlement:", e);
      return createResponse(false, "Error signing settlement: " + e.message, null, 'extended.submitOrder');
    }
    console.debug("settlement:", settlement);

    // 8. Componi il body
    let body;
    try {
      body = {
        id: crypto.randomUUID(),
        market: _symbol,
        type: _type,
        side: _side,
        qty: qty.toString(),
        price: midPrice.toString(),
        timeInForce: "IOC",
        expiryEpochMillis,
        fee: takerFeeRate,
        nonce: nonce.toString(),
        settlement,
        selfTradeProtectionLevel: "ACCOUNT"
      };
    } catch (e) {
      console.error("Error building order body:", e);
      return createResponse(false, "Error creating order body: " + e.message, null, 'extended.submitOrder');
    }
    console.debug("order body:", body);

    // 9. Post order
    try {
      const response = await _instance.post('/user/order', body);
      console.log(response.data);
      return createResponse(true, 'success', {symbol: _symbol, orderId: response.data.data.id}, 'extended.submitOrder');
    } catch (e) {
      console.error("Error submitting order:", e);
      return createResponse(false, e.response?.data ?? e.message, null, 'extended.submitOrder');
    }

  } catch (error) {
    return createResponse(
      false,
      error.response?.data ?? error.message,
      null,
      'extended.submitOrder'
    );
  }
}