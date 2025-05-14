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
        this.bot = new TelegramBot(_botToken, { polling: false });
        this.bot.on('error', console.error);
    }

    /**
     * Sends a message to the Telegram chat.
     * @async
     * @method sendMessage
     * @param {string} [_message=''] - Message content (supports HTML formatting).
     * @param {number} [_threadId] - Thread ID for Telegram groups with forums.
     * @returns {Promise<Object>} Response object.
     */
    async sendMessage(_message = '', _threadId) {
        const options = { parse_mode: 'HTML', ...( _threadId && { message_thread_id: _threadId }) };
        try {
            const response = await this.bot.sendMessage(this.chatId, _message, options);
            return createResponse(true, _message ? 'success' : 'Empty message sent successfully', response, 'TgNotifier.sendMessage');
        } catch (error) {
            return createResponse(false, error.message || 'Message sending failed', null, 'TgNotifier.sendMessage');
        }
    }
}