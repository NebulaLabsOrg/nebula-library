import TelegramBot from 'node-telegram-bot-api';

/**
 * @class TgNotifierClient
 * @description A client for sending notifications to a Telegram chat.
 */
export class TgNotifierClient {
    /**
     * @constructor
     * @param {string} [_botToken] - The Telegram Bot API token. This is mandatory.
     * @param {string} [_chatId] - The ID of the Telegram chat where notifications will be sent. Optional, can be set later.
     * @throws {Error} If the bot token is missing.
     */
    constructor(_botToken = undefined, _chatId = undefined) {
        // Ensure a bot token is provided
        if (!_botToken) {
            throw new Error('Missing valid bot token');
        }
        this.chatId = _chatId;
        // Initialize the Telegram Bot with polling enabled to receive updates
        this.bot = new TelegramBot(_botToken, { polling: false });

        // Error handler for the bot
        this.bot.on('error', (error) => {
            console.error('Telegram Bot Error:', error);
            // Re-throw the error to ensure it's not silently ignored
            throw error;
        });
    }

    /**
     * @async
     * @method sendMessage
     * @description Sends a message to the specified Telegram chat.
     * @param {string} [_message=''] - The message content (supports HTML formatting). Defaults to an empty string.
     * @param {number} [_threadId=undefined] - The ID of the message thread to send the message to (for Telegram groups with forums enabled). Optional.
     * @returns {Promise<TelegramBot.Message>} A Promise that resolves with the sent message object from the Telegram API.
     * @throws {Error} If the message is empty or if there's an error sending the message.
     */
    async sendMessage(_message = '', _threadId = undefined) {
        // Ensure the message is not empty
        if (!_message) {
            throw new Error('Message cannot be empty');
        }
    
        try {
            const options = { parse_mode: 'HTML' };
            if (_threadId !== undefined) {
                options.message_thread_id = _threadId;
            }
            return await this.bot.sendMessage(this.chatId, _message, options);
        } catch (error) {
            console.error('Error sending Telegram message:', error);
            throw error; // You could choose NOT to re-throw here for simplicity
        }
    }    

    /**
     * @public
     * @method setChatId
     * @description Sets the ID of the Telegram chat to send messages to.
     * @param {string} _chatId - The ID of the Telegram chat.
     * @returns {void}
     */
    setChatId(_chatId) {
        this.chatId = _chatId;
    }

    /**
     * @public
     * @method getChatId
     * @description Returns the currently set chat ID.
     * @returns {string | undefined} The ID of the Telegram chat.
     */
    getChatId() {
        return this.chatId;
    }
}