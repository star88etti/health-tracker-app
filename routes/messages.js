const express = require('express');
const router = express.Router();
const airtableService = require('../services/airtableService');

/**
 * Get messages for a user
 */
router.get('/', async (req, res) => {
  try {
    const phoneNumber = req.query.phoneNumber;
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }

    console.log('Getting messages for phone number:', phoneNumber);
    
    // Get messages from Airtable
    const messages = await airtableService.getMessages(phoneNumber);
    
    if (!messages.success) {
      return res.status(500).json({ 
        success: false, 
        error: messages.error 
      });
    }

    return res.json({ 
      success: true, 
      messages: messages.data 
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get messages' 
    });
  }
});

module.exports = router; 