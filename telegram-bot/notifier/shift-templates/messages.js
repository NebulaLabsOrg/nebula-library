/**
 * Generates a Telegram message for the strategy status.
 * @param {string} _version - The version of the vault.
 * @param {string} _decision - The current state or decision.
 * @param {number} _tvl - Total Value Locked in USD.
 * @param {number} _percLoss - Percentage loss of the vault.
 * @param {number} _apyOverall - Overall Annual Percentage Yield (APY).
 * @param {string} _market - The market strategy name.
 * @param {number} _percOnPerp - Percentage allocated to the market strategy.
 * @param {number} _apyMarket - APY for the market strategy.
 * @param {number} _apysUSDe - APY for sUSDe.
 * @param {string} _provider1 - Name of the first provider.
 * @param {string} _provider2 - Name of the second provider.
 * @param {string} _legProvider1 - Details for the first provider's leg.
 * @param {string} _legProvider2 - Details for the second provider's leg.
 * @param {number} _percLossPerp1 - Percentage loss for the first provider.
 * @param {number} _percLossPerp2 - Percentage loss for the second provider.
 * @returns {string} - Formatted Telegram message.
 */
export function shiftStrategy(_version, _decision, _tvl, _percLoss, _apyOverall, _market, _percOnPerp, _apyMarket, _apysUSDe, _provider1, _provider2, _legProvider1, _legProvider2, _percLossPerp1, _percLossPerp2) {
    return `
            🏦 <b>SHIFTing Vault v${_version}</b> 🏦
            ⚙️ <b>State:</b> ${_decision} ⚙️

            💵 <b>TVL:</b> $<code>${_tvl}</code>
            📉 <b>Loss:</b><code>${_percLoss}%</code>
            📈 <b>APY (current):</b> <code>${_apyOverall.toFixed(2)}%</code>
            🔹 <b>Strategy:</b> <code>${_market} (${_percOnPerp}%)</code> & <code>sUSDe (${100 - _percOnPerp}%)</code>

            📊 <b>Current Strategy Details:</b>
            📈 <b>APY ${_market}:</b> <code>${_apyMarket}%</code>
            📈 <b>APY sUSDe:</b> <code>${_apysUSDe}%</code>

            ➡️ <b>${_provider1}</b> (<code>${_legProvider1}</code>) - <b>Loss:</b><code>${_percLossPerp1}%</code>
            ➡️ <b>${_provider2}</b> (<code>${_legProvider2}</code>) - <b>Loss:</b><code>${_percLossPerp2}%</code>

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


/**
 * Generates a Telegram alert message for system errors.
 * @param {string} _version - The version of the system.
 * @param {string} _where - The location or component where the error occurred.
 * @param {string} _issue - The description of the issue.
 * @returns {string} - Formatted Telegram error message.
 */
export function shiftError(_version, _where, _issue) {
    return `
            🛑 <b>SHIFT System Error v${_version}</b> 🛑
            📍 <b>Where:</b> ${_where} 📍

            📋 <b>Issue:</b> <code>${_issue}</code>
            `;
}