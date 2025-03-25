// twilioService.js
const twilio = require('twilio');
const config = require('../config');

// Initialize Twilio client with error handling
let client;
try {
  if (config.twilio.accountSid && config.twilio.authToken) {
    client = twilio(config.twilio.accountSid, config.twilio.authToken);
    console.log('Twilio client initialized successfully');
  } else {
    console.warn('Twilio credentials missing. SMS/WhatsApp features disabled.');
    client = null;
  }
} catch (error) {
  console.error('Error initializing Twilio client:', error);
  client = null;
}
/**
 * Send a WhatsApp message to a user
 * @param {string} to - Recipient's phone number
 * @param {string} body - Message body
 * @returns {Promise<Object>} - Message details
 */
async function sendMessage(to, body) {
  try {
    // Ensure the number is in the correct format for WhatsApp
    const formattedNumber = formatPhoneNumber(to);
    
    // Send message
    const message = await client.messages.create({
      body,
      from: `whatsapp:${config.twilio.phoneNumber}`,
      to: `whatsapp:${formattedNumber}`
    });
    
    return {
      success: true,
      messageId: message.sid
    };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Format phone number for Twilio
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number
 */
function formatPhoneNumber(phoneNumber) {
  // Strip any non-numeric characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Ensure the number has the correct format
  if (!cleaned.startsWith('+')) {
    // Add + if missing
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Verify if a request is coming from Twilio
 * @param {Object} req - Express request object
 * @returns {boolean} - Whether the request is valid
 */
function validateRequest(req) {
  // Get the Twilio signature from the request headers
  const signature = req.headers['x-twilio-signature'];
  
  // Validate the request using the Twilio middleware
  const validator = twilio.webhook(config.twilio.authToken, {
    protocol: 'https',
    host: req.headers.host,
    url: req.originalUrl
  });
  
  try {
    // In development, you might want to skip validation
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    return validator(req, signature);
  } catch (error) {
    console.error('Error validating Twilio request:', error);
    return false;
  }
}

/**
 * Generate a TwiML response
 * @param {string} message - Message to include in the response
 * @returns {string} - TwiML response
 */
function generateTwimlResponse(message) {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(message);
  return twiml.toString();
}

module.exports = {
  sendMessage,
  validateRequest,
  generateTwimlResponse
};