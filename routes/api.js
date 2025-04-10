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

/**
 * Get health data for a user
 */
router.get('/health-data', async (req, res) => {
  try {
    const { phoneNumber, days = 7 } = req.query;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Get exercise logs
    const exerciseLogs = await airtableService.getExerciseLogs(phoneNumber, days);
    
    // Get food logs
    const foodLogs = await airtableService.getFoodLogs(phoneNumber, days);
    
    res.json({
      success: true,
      data: {
        exerciseLogs,
        foodLogs
      }
    });
  } catch (error) {
    console.error('Error getting health data:', error);
    res.status(500).json({ error: 'Failed to get health data' });
  }
});

/**
 * Get messages for a user
 */
router.get('/messages', async (req, res) => {
  try {
    const { phoneNumber } = req.query;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Get messages from Airtable
    const messages = await airtableService.getMessages(phoneNumber);
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

module.exports = router;