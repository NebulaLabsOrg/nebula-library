export function fromAPRtoAPY(_aprPercent, _m) {
  const aprDecimal = _aprPercent / 100;
  return (Math.pow(1 + aprDecimal / _m, _m) - 1) * 100;
}

export function fromAPRtoROI30d(_aprPercent) {
  // APR to ROI30d as a decimal
  return _aprPercent / 100 / 12;
}

export function fromAPYtoAPR(_apyPercent, _m) {
  // APY to APR as a percent
  const apyDecimal = _apyPercent / 100;
  return (Math.pow(1 + apyDecimal, 1 / _m) - 1) * _m * 100;
}