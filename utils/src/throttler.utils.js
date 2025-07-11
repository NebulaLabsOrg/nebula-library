/**
 * @class TokenBucketThrottler
 * @description A class implementing the token bucket algorithm for rate-limiting asynchronous operations.
 * Limits the number of operations (e.g., API calls) per minute, queues excess requests, and processes them as tokens become available.
 * Provides methods to enable/disable throttling, enqueue operations, and manage the refill process.
 */
export class TokenBucketThrottler {
    /**
     * @constructor
     * @param {number} limitPerMinute - Maximum number of allowed operations per minute.
     * @param {boolean} [enabled=true] - Whether throttling is enabled.
     * @param {number} [slippageFactor=0.9] - Safety margin (e.g., 0.9 = 90% of limit).
     * @param {boolean} [debug=false] - Enables debug logging.
     */
    constructor(limitPerMinute, enabled = true, slippageFactor = 0.9, debug = false) {
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
        while (this.tokens >= 1 && this.queue.length > 0) {
            const { fn, resolve, reject } = this.queue.shift();
            this.tokens -= 1;
            fn().then(resolve).catch(reject);
        }
    }

    enqueue(fn) {
        if (!this.enabled) return fn();
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
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
