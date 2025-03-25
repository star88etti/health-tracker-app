# Health Tracker MVP

## Environment Setup

This application requires several API keys and credentials to function properly. Follow these steps to set up your environment:

1. Copy `.env.example` to `.env`:
2. Edit `.env` and add your actual API keys and credentials:
- Twilio credentials (for SMS/WhatsApp functionality)
- OpenAI API key (for message processing)
- Airtable credentials (for data storage)

3. For security, never commit your `.env` file to version control.

## Deployment

When deploying to Heroku, set the environment variables in the Heroku dashboard or using the Heroku CLI.