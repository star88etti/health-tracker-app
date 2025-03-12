const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Health Tracker API is running!');
});

// Webhook endpoint
app.post('/webhook/message', (req, res) => {
  console.log('Received webhook:', req.body);
  res.set('Content-Type', 'text/xml');
  res.send('<Response><Message>Your message was received!</Message></Response>');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
