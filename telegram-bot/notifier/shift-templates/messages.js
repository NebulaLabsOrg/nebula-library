/**
 * Generates a Telegram message for the strategy status.
 * @param {string} _version - The version of the vault.
 * @param {string} _decision - The current state or decision.
 * @param {number} _tvl - Total Value Locked in USD.
 * @param {number} _apyOverall - Overall Annual Percentage Yield (APY).
 * @param {string} _market - The market strategy name.
 * @param {number} _percOnPerp - Percentage allocated to perpetuals.
 * @param {number} _apyMarket - APY for the market strategy.
 * @param {number} _apysUSDe - APY for sUSDe.
 * @param {string} _paradexLeg - Paradex leg details.
 * @param {string} _bybitLeg - Bybit leg details.
 * @returns {string} - Formatted Telegram message.
 */
export function shiftStrategy(_version, _decision, _tvl, _apyOverall, _market, _percOnPerp, _apyMarket, _apysUSDe, _paradexLeg, _bybitLeg) {
    return `
            🏦 <b>SHIFTing Vault v${_version}</b> 🏦
            ⚙️ <b>State:</b> ${_decision} ⚙️

            💵 <b>TVL:</b> $<code>${_tvl}</code>
            📈 <b>APY (actual):</b> <code>${_apyOverall.toFixed(2)}%</code>
            🔹 <b>Strategy:</b> <code>${_market} (${_percOnPerp}%)</code> & <code>sUSDe (${100 - _percOnPerp}%)</code>

            📊 <b>Actual Strategy Details:</b>
            📈 <b>APY ${_market}:</b> <code>${_apyMarket}%</code>
            📈 <b>APY sUSDe:</b> <code>${_apysUSDe}%</code>

            ➡️ <b>Paradex</b> (<code>${_paradexLeg}</code>)
            ➡️ <b>Bybit</b> (<code>${_bybitLeg}</code>)

            `;
}

/**
 * Generates a Telegram alert message for risk handling.
 * @param {string} _version - The version of the risk handler.
 * @param {string} _action - The action taken.
 * @param {string} _reason - The reason for the action.
 * @returns {string} - Formatted Telegram alert message.
 */
export function shiftAlert(_version, _action, _reason){
    return `
            🚩 <b>SHIFT Risk Handler v${_version}</b> 🚩
            ⚙️ <b>Action:</b> ${_action} ⚙️

            📋 <b>Reason:</b> <code>${_reason}</code>
            `;
}

/**
 * Generates a Telegram message for withdrawal requests.
 * @param {string} _version - The version of the fund handler.
 * @param {string} _address - The user's wallet address.
 * @param {number} _amount - The amount to withdraw in sUSDC.
 * @param {number} _value - The value in USD.
 * @returns {string} - Formatted Telegram withdrawal message.
 */
export function shiftWithraw(_version, _address, _amount, _value){
    return `
            🪙 <b>SHIFT Fund Handler v${_version}</b> 🪙
            ⚙️ <b>Action:</b> Withdraw Requested⚙️

            👤 <b>Wallet:</b> <code>${_address}</code>
            💵 <b>Amount:</b> <code>${_amount}</code> sUSDC
            💸 <b>Value:</b> $<code>${_value}</code>
            `;
}