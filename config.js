require('dotenv').config();

const requiredEnvVars = [
    'OPENAI_API_KEY',
    'GOOGLE_SHEETS_CREDENTIALS',
    'GOOGLE_SHEETS_ID',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
];

function validateEnv() {
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
}

module.exports = {
    validateEnv
}; 