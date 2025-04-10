// app.js
const express = require('express');
const bodyParser = require('body-parser');
const webhookRoutes = require('./routes/webhook');
const apiRoutes = require('./routes/api');
const messagesRoutes = require('./routes/messages');
const cors = require('cors'); // You'll need to install this

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Enable CORS for all origins (for development)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', ' x-phone-number']
}));

// Routes
app.use('/webhook', webhookRoutes);
app.use('/api', apiRoutes);
app.use('/messages', messagesRoutes);

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