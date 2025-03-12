const twilio = require('twilio');
require('dotenv').config();

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

async function sendHealthUpdate(to, message) {
    try {
        const response = await client.messages.create({
            body: message,
            to: to,
            from: process.env.TWILIO_PHONE_NUMBER
        });
        return response;
    } catch (error) {
        console.error('Error sending Twilio message:', error);
        throw error;
    }
}

module.exports = {
    sendHealthUpdate
}; 