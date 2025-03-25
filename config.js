// Updated config.js
require('dotenv').config();

const config = {

  apiBaseUrl: 'https://health-tracker-new-app-7de8aa984308.herokuapp.com/',
  // Twilio settings
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER // Your Twilio WhatsApp number
  },
  
  // OpenAI settings
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo', // Changed from gpt-4-turbo-preview to a widely available model
    maxTokens: 500,
    temperature: 0.2
  },
  
  // Airtable settings
  airtable: {
    personalAccessToken: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
    baseId: process.env.AIRTABLE_BASE_ID,
    tables: {
      users: process.env.AIRTABLE_USERS_TABLE_ID || 'Users',
      exerciseLogs: process.env.AIRTABLE_EXERCISE_LOGS_TABLE_ID || 'Exercise Logs',
      foodLogs: process.env.AIRTABLE_FOOD_LOGS_TABLE_ID || 'Food Logs'
    }
  }
};

module.exports = config;