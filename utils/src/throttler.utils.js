/**
 * @class TokenBucketThrottler
 * @description Implements the token bucket algorithm with support for variable call weights.
 */
export class TokenBucketThrottler {
    /**
     * @constructor
     * @param {number} limitPerMinute - Maximum number of operations per minute.
     * @param {number} [slippageFactor=0.9] - Safety margin (e.g., 0.9 = 90% of the limit).
     * @param {boolean} [enabled=true] - Whether throttling is enabled.
     * @param {boolean} [debug=false] - Enables debug logs.
     */
    constructor(limitPerMinute, slippageFactor = 0.9, enabled = true, debug = false) {
        this.capacity = Math.floor(limitPerMinute * slippageFactor); // Safe max tokens per minute
        this.refillRate = this.capacity / 60; // Safe tokens per second
        this.tokens = Math.floor(this.refillRate);
        this.queue = [];
        this.enabled = enabled;
        this.debug = debug;
        this.intervalId = null;
    }

    startRefill() {
        if (this.intervalId === null) {
            if (this.debug) console.log('call in queue', this.queue.length)
            this.intervalId = setInterval(() => this.refillTokens(), 1000);
        }
    }

    stopRefillIfIdle() {
        if (this.queue.length === 0 && this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    refillTokens() {
        if (this.debug) console.log('call in queue', this.queue.length)
        this.tokens = Math.min(this.capacity, this.tokens + this.refillRate);
        if (this.debug) console.log('.. new tokens available', this.tokens);
        this.processQueue();
        this.stopRefillIfIdle();
    }

    processQueue() {
        while (this.queue.length > 0) {
            const { fn, resolve, reject, weight } = this.queue[0];
            if (this.tokens >= weight) {
                this.queue.shift();
                this.tokens -= weight;
                fn().then(resolve).catch(reject);
            } else {
                break; // Not enough tokens for this call, exit
            }
        }
    }

    /**
     * Queues a function to be executed when enough tokens are available.
     * @param {Function} fn - The asynchronous operation to execute.
     * @param {number} [weight=1] - How many tokens the call consumes.
     * @returns {Promise}
     */
    enqueue(fn, weight = 1) {
        if (!this.enabled) return fn();
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject, weight });
            this.startRefill();
            this.processQueue();
        });
    }

    setEnabled(state) {
        this.enabled = state;
    }

    stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}