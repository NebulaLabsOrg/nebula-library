/**
 * Converts APR (Annual Percentage Rate) to APY (Annual Percentage Yield) as a percent.
 * Uses the formula for compounding interest based on the number of compounding periods per year.
 * @param {number} _aprPercent - The APR value as a percent.
 * @param {number} _m - The number of compounding periods per year.
 * @returns {number} The APY value as a percent.
 */
export function fromAPRtoAPY(_aprPercent, _m) {
  const aprDecimal = _aprPercent / 100;
  return (Math.pow(1 + aprDecimal / _m, _m) - 1) * 100;
}

/**
 * Converts APR (Annual Percentage Rate) to ROI (Return on Investment) for 30 days as a decimal.
 * Assumes 12 periods in a year (monthly compounding).
 * @param {number} _aprPercent - The APR value as a percent.
 * @returns {number} The 30-day ROI as a decimal.
 */
export function fromAPRtoROI30d(_aprPercent) {
  // APR to ROI30d as a decimal
  return _aprPercent / 100 / 12;
}

/**
 * Converts APY (Annual Percentage Yield) to APR (Annual Percentage Rate) as a percent.
 * Uses the formula for reversing compounding interest based on the number of compounding periods per year.
 * @param {number} _apyPercent - The APY value as a percent.
 * @param {number} _m - The number of compounding periods per year.
 * @returns {number} The APR value as a percent.
 */
export function fromAPYtoAPR(_apyPercent, _m) {
  // APY to APR as a percent
  const apyDecimal = _apyPercent / 100;
  return (Math.pow(1 + apyDecimal, 1 / _m) - 1) * _m * 100;
}