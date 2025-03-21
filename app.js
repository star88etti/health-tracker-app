// Main application file
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const webhookRoutes = require('./routes/webhook');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Routes
app.use('/webhook', webhookRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Health Tracker API is running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook/message`);
  console.log('Note: Use ngrok or similar tool to expose your local server to the internet');
});

module.exports = app;

