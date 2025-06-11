/**
 * @async
 * @function retry
 * @description Executes an asynchronous function with retry logic. Retries the function up to a specified number of times if it fails (either by throwing an error or returning an object with success: false), waiting a specified delay between attempts.
 * @param {Function} fn - The asynchronous function to execute. Should return a Promise that resolves to an object with a 'success' property.
 * @param {number} [retries=3] - The maximum number of attempts.
 * @param {number} [delay=1000] - The delay in milliseconds between attempts.
 * @returns {Promise<Object>} A Promise that resolves with the successful result or rejects after all retries fail.
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