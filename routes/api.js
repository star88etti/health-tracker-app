// routes/api.js
const express = require('express');
const router = express.Router();
const airtableService = require('../services/airtableService');

// Login endpoint - verify phone number
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    console.log(`Login attempt for phone number: ${phoneNumber}`);
    
    // Check if user exists in Airtable
    const user = await airtableService.ensureUserExists(phoneNumber);
    
    if (user.error) {
      return res.status(500).json({ error: user.error });
    }
    
    // For simplicity, we'll just use a fixed token
    // In production, you should use JWT (jsonwebtoken package)
    const token = 'health-buddie-token-' + Date.now();
    
    console.log(`Login successful for user: ${phoneNumber}`);
    
    res.json({
      success: true,
      token,
      user: {
        phoneNumber,
        isNew: user.isNew,
        exerciseGoal: user.exerciseGoal,
        foodLogGoal: user.foodLogGoal
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get user health data
router.get('/health-data', async (req, res) => {
  try {
    // Get phone number from query parameter for simplicity
    const userId = req.query.phoneNumber;
    if (!userId) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Default to 7 days, but allow query parameter to override
    const days = req.query.days ? parseInt(req.query.days) : 7;
    
    const status = await airtableService.getUserStatus(userId, days);
    
    if (!status.success) {
      return res.status(500).json({ error: status.error });
    }
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting health data:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get recent messages
router.get('/messages', async (req, res) => {
  try {
    // Get phone number from query parameter
    const userId = req.query.phoneNumber;
    if (!userId) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Get user data from Airtable
    const status = await airtableService.getUserStatus(userId, 30); // Last 30 days of data
    
    // Convert Airtable data to message format
    const messages = [];
    
    if (status.success) {
      // Add exercise logs as messages
      status.exerciseLogs.forEach(log => {
        messages.push({
          id: `exercise-${Date.now()}-${Math.random()}`,
          content: log.rawMessage || `Exercise: ${log.type} for ${log.duration} minutes`,
          timestamp: new Date(log.date),
          type: 'incoming',
          channel: 'whatsapp',
          category: 'exercise',
          processed: true,
          processed_data: {
            exercise: {
              duration: log.duration,
              type: log.type,
              distance: log.distance
            }
          }
        });
      });
      
      // Add food logs as messages
      status.foodLogs.forEach(log => {
        messages.push({
          id: `food-${Date.now()}-${Math.random()}`,
          content: log.foodItems,
          timestamp: new Date(log.date),
          type: 'incoming',
          channel: 'whatsapp',
          category: 'food',
          processed: true,
          processed_data: {
            food: {
              description: log.foodItems
            }
          }
        });
      });
    }
    
    // Sort messages by timestamp (newest first)
    messages.sort((a, b) => b.timestamp - a.timestamp);
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

module.exports = router;