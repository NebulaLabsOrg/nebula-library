import TelegramBot from 'node-telegram-bot-api';

export class TgNotifierClient {
    constructor(_botToken = undefined, _chatId = undefined) {
        if (!_botToken) {
            throw new Error('Missing valid bot token');
        }
        this.chatId = _chatId;
        this.bot = new TelegramBot(_botToken, { polling: true });
        this.bot.on('error', (error) => {
            console.error('Bot Error:', error);
            throw error; // Propaga l'errore
        });
    }

    async sendMessage(_message = '', _threadId = undefined) {
        try {
            if (!_message) {
                throw new Error('Message cannot be empty');
            }
            
            const options = {
                parse_mode: 'HTML'
            };
            
            if (_threadId !== undefined) {
                options.message_thread_id = _threadId;
            }
            
            return await this.bot.sendMessage(this.chatId, _message, options);
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    kill() {
        try {
            this.bot.stopPolling();
        } catch (error) {
            console.error('Error stopping bot:', error);
            throw error;
        }
    }
}