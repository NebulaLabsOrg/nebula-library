import { TgNotifier } from '../index.js';
import { shiftAlert, shiftWithraw } from '../index.js';
import 'dotenv/config';

// Replace with your Telegram bot token and chat ID
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const threadId = process.env.TELEGRAM_TOPIC_ID;

// Create an instance of TgNotifier
const notifier = new TgNotifier(botToken, chatId);

// Send a message
console.log(await notifier.sendMessage(shiftAlert(3, 'Rebalance', 'Loss over 80%'), threadId));
console.log(await notifier.sendMessage(shiftWithraw(3, '0xergr5tg', '2132', '250000'), threadId));
