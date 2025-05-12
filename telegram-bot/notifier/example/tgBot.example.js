import { TgNotifier } from '../src/tgBot.js';
import 'dotenv/config';

// Replace with your Telegram bot token and chat ID
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const threadId = process.env.TELEGRAM_TOPIC_ID;

// Create an instance of TgNotifier
const notifier = new TgNotifier(botToken, chatId);

// Send a message
const response = await notifier.sendMessage('Hello, this is a test message!', threadId);
console.log(response);
