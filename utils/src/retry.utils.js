/**
 * Attempts to execute an asynchronous function multiple times with a delay between retries.
 * Retries the function if it throws an error or returns an object with success: false.
 * Logs each failed attempt and throws an error if all retries are exhausted.
 *
 * @param {Function} fn - The asynchronous function to execute. Should return a promise that resolves to an object with a 'success' property.
 * @param {number} [retries=3] - The maximum number of attempts.
 * @param {number} [delay=1000] - Delay in milliseconds between retries.
 * @returns {Promise<object>} The result of the successful function call.
 * @throws {Error} If all retry attempts fail.
 */
export async function retry(fn, retries = 3, delay = 1000) {
    for (let i = 1; i <= retries; i++) {
        try {
            const result = await fn();
            if (result.success) return result;
            console.log(`Attempt ${i} failed:`, result.message);
        } catch (error) {
            console.log(`Attempt ${i} failed:`, error.message);
        }
        if (i < retries) await new Promise(r => setTimeout(r, delay));
    }
    throw new Error("Max retry attempts reached.");
}