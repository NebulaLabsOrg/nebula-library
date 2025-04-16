import { expect } from 'chai';
import sinon from 'sinon';
import { TgNotifierClient } from '../src/tg-bot-client.js';
import 'dotenv/config';

const mockBotToken = process.env.BOT_TOKEN;
const mockChatId = process.env.CHAT_ID;
const mockThreadId = process.env.THREAD_ID;

describe('TgNotifierClient', () => {
    let tgNotifierClient;
    let botSendMessageStub;
    let botStopPollingStub;

    beforeEach(() => {
        // Create a new instance of TgNotifierClient
        tgNotifierClient = new TgNotifierClient(mockBotToken, mockChatId);

        // Stub the TelegramBot methods to mock their behavior
        botSendMessageStub = sinon.stub(tgNotifierClient.bot, 'sendMessage');
        botStopPollingStub = sinon.stub(tgNotifierClient.bot, 'stopPolling');
    });

    afterEach(() => {
        // Restore the stubs to their original state
        sinon.restore();
    });

    it('should throw an error if bot token is missing in constructor', () => {
        expect(() => new TgNotifierClient(undefined)).to.throw('Missing valid bot token');
    });

    it('should send a message successfully', async () => {
        // Arrange
        const mockMessage = 'Test Message';
        botSendMessageStub.resolves({ message_id: 123, text: mockMessage });

        // Act
        const result = await tgNotifierClient.sendMessage(mockMessage, mockThreadId);

        // Assert
        expect(botSendMessageStub.calledOnce).to.be.true;
        expect(result.text).to.equal(mockMessage);
    });

    it('should throw an error if message is empty', async () => {
        try {
            await tgNotifierClient.sendMessage(); // Call the method without arguments
            expect.fail('Expected method to throw an error, but it did not'); // Fail the test if no error is thrown
        } catch (error) {
            expect(error.message).to.equal('Message cannot be empty'); // Check the error message directly
        }
    });
  
    it('should set and get chatId correctly', () => {
      // Arrange
      const newChatId = '123456';

      // Act
      tgNotifierClient.setChatId(newChatId);
      const result = tgNotifierClient.getChatId();

      // Assert
      expect(result).to.equal(newChatId);
   });
});
