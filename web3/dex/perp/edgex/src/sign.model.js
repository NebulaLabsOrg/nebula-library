import { sign, pedersen } from '@starkware-industries/starkware-crypto-utils';
import { WITHDRAWAL_TO_ADDRESS, LIMIT_ORDER_WITH_FEES, TRANSFER } from './const.js';

/** 
 * Withdrawal Signature
 */
export function getWithdrawalToAddressMsg({
  assetIdCollateral,
  positionId,
  ethAddress, 
  nonce,
  expirationTimestamp,
  amount
}) {
  const w1 = assetIdCollateral;
  let w5 = WITHDRAWAL_TO_ADDRESS;
  w5 = (w5 << 64n) + BigInt(positionId);
  w5 = (w5 << 32n) + BigInt(nonce); 
  w5 = (w5 << 64n) + BigInt(amount);
  w5 = (w5 << 32n) + BigInt(expirationTimestamp);
  w5 = w5 << 49n;

  return pedersen([
    pedersen([w1, ethAddress]),
    w5.toString(16)
  ]);
}

/**
 * Limit Order Signature
 */
export function getLimitOrderMsg({
  assetIdSynthetic,
  assetIdCollateral,
  isBuyingSynthetic,
  assetIdFee,
  amountSynthetic,
  amountCollateral,
  maxAmountFee,
  nonce,
  positionId,
  expirationTimestamp
}) {
  const [assetIdSell, assetIdBuy] = isBuyingSynthetic 
    ? [assetIdCollateral, assetIdSynthetic]
    : [assetIdSynthetic, assetIdCollateral];
  const [amountSell, amountBuy] = isBuyingSynthetic
    ? [amountCollateral, amountSynthetic] 
    : [amountSynthetic, amountCollateral];

  let msg = pedersen([assetIdSell, assetIdBuy]);
  msg = pedersen([msg, assetIdFee]);

  let w4 = BigInt(amountSell);
  w4 = (w4 << 64n) + BigInt(amountBuy);
  w4 = (w4 << 64n) + BigInt(maxAmountFee);
  w4 = (w4 << 32n) + BigInt(nonce);
  msg = pedersen([msg, w4.toString(16)]);

  let w5 = LIMIT_ORDER_WITH_FEES;
  w5 = (w5 << 64n) + BigInt(positionId);
  w5 = (w5 << 64n) + BigInt(positionId);
  w5 = (w5 << 64n) + BigInt(positionId);
  w5 = (w5 << 32n) + BigInt(expirationTimestamp);
  w5 = w5 << 17n;

  return pedersen([msg, w5.toString(16)]);
}

/**
 * Transfer Signature
 */
export function getTransferMsg({
  assetId,
  receiverPublicKey,
  senderPositionId,
  receiverPositionId,
  srcFeePositionId,
  nonce,
  amount,
  expirationTimestamp,
  assetIdFee = '0',
  maxAmountFee = '0'
}) {
  const w1 = assetId;
  const w2 = assetIdFee;
  const w3 = receiverPublicKey;

  let w4 = BigInt(senderPositionId);
  w4 = (w4 << 64n) + BigInt(receiverPositionId);
  w4 = (w4 << 64n) + BigInt(srcFeePositionId); 
  w4 = (w4 << 32n) + BigInt(nonce);

  let w5 = TRANSFER;
  w5 = (w5 << 64n) + BigInt(amount);
  w5 = (w5 << 64n) + BigInt(maxAmountFee);
  w5 = (w5 << 32n) + BigInt(expirationTimestamp);
  w5 = w5 << 81n;

  let msg = pedersen([w1, w2]);
  msg = pedersen([msg, w3]);
  msg = pedersen([msg, w4.toString(16)]);
  return pedersen([msg, w5.toString(16)]);
}

/**
 * Firma generica L2
 */
export function signL2Message(msg, privateKeyHex) {
  return sign(privateKeyHex, msg); // { r, s }
}