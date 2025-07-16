import { ec, hash } from "starknet";

function getLimitOrderMsg(
  assetIdSynthetic,
  assetIdCollateral,
  isBuyingSynthetic,
  assetIdFee,
  amountSynthetic,
  amountCollateral,
  maxFee,
  nonce,
  positionId,
  expirationHours
) {
  let assetIdSell, assetIdBuy, amountSell, amountBuy;
  if (isBuyingSynthetic) {
    assetIdSell = assetIdCollateral;
    assetIdBuy = assetIdSynthetic;
    amountSell = amountCollateral;
    amountBuy = amountSynthetic;
  } else {
    assetIdSell = assetIdSynthetic;
    assetIdBuy = assetIdCollateral;
    amountSell = amountSynthetic;
    amountBuy = amountCollateral;
  }

  let msg = hash.computePedersenHash(BigInt(assetIdSell), BigInt(assetIdBuy));
  msg = hash.computePedersenHash(msg, BigInt(assetIdFee));

  let packed0 = BigInt(amountSell);
  packed0 = packed0 * 2n ** 64n + BigInt(amountBuy);
  packed0 = packed0 * 2n ** 64n + BigInt(maxFee);
  packed0 = packed0 * 2n ** 32n + BigInt(nonce);
  msg = hash.computePedersenHash(msg, packed0);

  let packed1 = 3n;
  packed1 = packed1 * 2n ** 64n + BigInt(positionId);
  packed1 = packed1 * 2n ** 64n + BigInt(positionId);
  packed1 = packed1 * 2n ** 64n + BigInt(positionId);
  packed1 = packed1 * 2n ** 32n + BigInt(expirationHours);
  packed1 = packed1 * 2n ** 17n;
  msg = hash.computePedersenHash(msg, packed1);

  return msg;
}

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
  throw new Error("Private key must be hex string, decimal string, or bigint");
}

function signSettlement({
  privateKey,
  publicKey,
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
}) {

    console.log('Parameters for signSettlement:', {
        privateKey,
        publicKey,
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
        }
    )

  const bufferSeconds = 14n * 24n * 60n * 60n;
  const expiryWithBuffer = BigInt(expirationTimestamp) + bufferSeconds;
  const expirationHours = BigInt(Math.ceil(Number(expiryWithBuffer) / 3600));

  const orderHash = getLimitOrderMsg(
    assetIdSynthetic,
    assetIdCollateral,
    isBuyingSynthetic,
    assetIdFee,
    amountSynthetic,
    amountCollateral,
    maxFee,
    nonce,
    positionId,
    expirationHours
  );

  const privKeyHex = ensureHexPrivateKey(privateKey);

  const signature = ec.starkCurve.sign(orderHash, privKeyHex);

  const starkKeyHex = publicKey
    ? publicKey
    : "0x" + ec.starkCurve.getStarkKey(privKeyHex).toString(16);

  return {
    signature: {
      r: '0x' + signature.r.toString(16),
      s: '0x' + signature.s.toString(16),
    },
    starkKey: starkKeyHex,
    collateralPosition: BigInt(positionId).toString(),
    orderHash: '0x' + orderHash.toString(16),
  };
}

export { signSettlement };