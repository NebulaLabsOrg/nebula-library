import chalk from "chalk";
/**
 * Utility object for logging messages to the console with styled output.
 * Uses the `chalk` library to apply colors and styles to the log messages.
 *
 * @property {Function} message - Logs a message in gray (dimmed) style.
 * @property {Function} call - Logs a message in cyan (blue) style.
 * @property {Function} warning - Logs a message in yellow style.
 * @property {Function} success - Logs a message in green style.
 */
const consoleLog = {
    message: (...args) => console.log(chalk.dim(...args)),
    call: (...args) => console.log(chalk.cyan(...args)),
    warning: (...args) => console.log(chalk.yellow(...args)),
    success: (...args) => console.log(chalk.green(...args)),
};

export default consoleLog;