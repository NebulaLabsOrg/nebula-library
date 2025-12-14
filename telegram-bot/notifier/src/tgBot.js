import TelegramBot from 'node-telegram-bot-api';
import { createResponse } from '../../../utils/src/response.utils.js';

/**
 * @class TgNotifier
 * @description Class for sending notifications to a Telegram chat.
 */
export class TgNotifier {
    /**
     * @constructor
     * @param {string} _botToken - Telegram bot API token (mandatory).
     * @param {string} [_chatId] - Telegram chat ID where notifications will be sent (optional, can be set later).
     * @throws {Error} If the bot token is missing.
     */
    constructor(_botToken, _chatId) {
        if (!_botToken) throw new Error('Bot token is missing or invalid');
        this.chatId = _chatId;
        this.bot = new TelegramBot(_botToken, { 
            polling: false,
            request: {
                agentOptions: {
                    timeout: 30000 // 30 seconds timeout for network requests
                }
            }
        });
        this.bot.on('error', console.error);
    }

    /**
     * Sends a message to the Telegram chat with automatic retry on failure.
     * @async
     * @method sendMessage
     * @param {string} [_message=''] - Message content (supports HTML formatting).
     * @param {number} [_threadId] - Thread ID for Telegram groups with forums.
     * @param {number} [_retries=3] - Number of retry attempts on failure.
     * @returns {Promise<Object>} Response object.
     */
    async sendMessage(_message = '', _threadId, _retries = 3) {
        const options = { parse_mode: 'HTML', ...( _threadId && { message_thread_id: _threadId }) };
        
        for (let attempt = 1; attempt <= _retries; attempt++) {
            try {
                const response = await this.bot.sendMessage(this.chatId, _message, options);
                return createResponse(true, _message ? 'success' : 'Empty message sent successfully', response, 'TgNotifier.sendMessage');
            } catch (error) {
                // If this is not the last attempt, wait before retrying
                if (attempt < _retries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
                    continue;
                }
                
                // Last attempt failed - extract detailed error message
                let errorMessage = error.message || 'Message sending failed';
                
                // Handle AggregateError with multiple underlying errors
                if (error.errors && Array.isArray(error.errors)) {
                    errorMessage = `${errorMessage}: ${error.errors.map(e => e.message).join('; ')}`;
                }
                
                return createResponse(false, errorMessage, null, 'TgNotifier.sendMessage');
            }
        }
    }
}