# Health Tracker Setup Guide

This guide will walk you through the process of setting up your Health Tracker MVP application step-by-step.

## 1. Project Setup

### Create Your Project Directory
```bash
mkdir health-tracker-mvp
cd health-tracker-mvp
```

### Initialize the Project
```bash
npm init -y
```

### Install Dependencies
```bash
npm install express body-parser twilio openai googleapis dotenv
npm install --save-dev nodemon
```

## 2. Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/) and create a new spreadsheet
2. Name it "Health Tracker Data"
3. Create three tabs with these exact names:
   - "Users"
   - "Exercise Logs"
   - "Food Logs"
4. Add headers to each tab:
   - In "Users": Add these headers in row 1: `userId, name, onboardingComplete, exerciseGoal, foodLogGoal`
   - In "Exercise Logs": Add these headers in row 1: `timestamp, userId, duration, type, distance, rawMessage`
   - In "Food Logs": Add these headers in row 1: `timestamp, userId, foodItems, rawMessage`
5. Note your spreadsheet ID from the URL (it's the long string between `/d/` and `/edit` in the URL)

## 3. Set Up Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click on it and press "Enable"
4. Create a service account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in a name and description
   - Click "Create and Continue"
   - For Role, select "Editor"
   - Click "Continue" and then "Done"
5. Create a key for your service account:
   - Click on the service account you just created
   - Go to the "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Choose JSON format
   - Download the key file
6. Share your Google Sheet with the service account:
   - Open your Google Sheet
   - Click the "Share" button
   - Add the service account email (it's in the key file you downloaded)
   - Give it "Editor" access
   - Uncheck the "Notify people" option
   - Click "Share"

## 4. Set Up Twilio WhatsApp Sandbox

1. Create a Twilio account at [twilio.com](https://www.twilio.com/try-twilio)
2. From the Twilio dashboard, navigate to "Messaging" > "Try it out" > "Send a WhatsApp message"
3. Follow the instructions to join your WhatsApp Sandbox:
   - You'll need to send a specific message from your WhatsApp to a Twilio number
   - After sending the message, you should receive a confirmation
4. Note your Twilio Account SID and Auth Token from the dashboard

## 5. Get OpenAI API Key

1. Create an account at [OpenAI](https://platform.openai.com/signup) if you don't already have one
2. Go to the API section
3. Create a new API key
4. Copy the key (you won't be able to see it again)

## 6. Project Structure

Create the following folder structure in your project:

```
health-tracker-mvp/
├── services/
│   ├── openaiService.js
│   ├── sheetsService.js
│   └── twilioService.js
├── routes/
│   └── webhook.js
├── app.js
├── config.js
├── .env
└── package.json
```

## 7. Configure the Application

1. Create the `.env` file in your project root with your API keys and credentials:
```
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+14155238886  # Your Twilio WhatsApp Sandbox number

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Google Sheets Configuration
GOOGLE_SHEETS_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"

# Server Configuration
PORT=3000
NODE_ENV=development
```

2. For the `GOOGLE_PRIVATE_KEY`, copy the entire private key from your downloaded JSON file, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` parts. Make sure to wrap it in quotes and replace all newlines with `\n`.

## 8. Start the Application

1. Add this to your `package.json` scripts section:
```json
"scripts": {
  "start": "node app.js",
  "dev": "nodemon app.js"
}
```

2. Start the server:
```bash
npm run dev
```

3. You should see output showing the server is running on port 3000.

## 9. Expose Your Local Server

To receive Twilio webhooks, your local server needs to be accessible from the internet.

1. Download and install [ngrok](https://ngrok.com/download)
2. Open a new terminal and run:
```bash
ngrok http 3000
```
3. Note the HTTPS URL that ngrok gives you (e.g., `https://abc123.ngrok.io`)

## 10. Set Up Twilio Webhook

1. Go to your Twilio console
2. Navigate to "Messaging" > "Settings" > "WhatsApp Sandbox Settings"
3. In the "When a message comes in" field, enter your ngrok URL followed by `/webhook/message`:
```
https://abc123.ngrok.io/webhook/message
```
4. Make sure the method is set to HTTP POST
5. Save your changes

## 11. Test the Application

1. Send a message to your Twilio WhatsApp number:
   - Try an exercise message: "I ran for 30 minutes today"
   - Try a food message: "Had eggs and toast for breakfast"
   - Try a status request: "status"

2. Check your Google Sheet to see if the data is being logged properly

3. You should receive appropriate responses to your messages

## Troubleshooting

### Webhook Issues
- If your webhook isn't receiving messages, check that your ngrok URL is correct in Twilio
- Make sure your server is running
- Check the Twilio dashboard for webhook errors

### Google Sheets Issues
- Make sure you've shared your sheet with the service account email
- Check that you've enabled the Google Sheets API
- Verify your spreadsheet ID is correct

### OpenAI Issues
- Verify your API key is correct
- Check your OpenAI account has sufficient credits

### Environment Variable Issues
- Make sure your `.env` file is in the root directory
- Check that all variables are set correctly
- For the Google private key, ensure all newlines are replaced with `\n`