// routes/api.js

const express = require('express');
const router = express.Router();
const airtableService = require('../services/airtableService');

// Add CORS headers to allow requests from your frontend
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // In production, specify your domain instead of *
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    // Pre-flight request
    return res.status(200).end();
  }
  
  next();
});

// Simple authentication middleware
// This extracts the phone number from the Authorization header
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    // Extract the phone number from the Bearer token
    // In a real app, you'd use a proper JWT token for authentication
    const phoneNumber = authHeader.split(' ')[1];
    
    if (!phoneNumber) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    // Add the phone number to the request object
    req.user = { phoneNumber };
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

// API endpoint to verify a user by phone number
router.post('/verify', async (req, res) => {
  try {
    const { phoneNumber, verificationCode } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    
    // For this MVP, we'll bypass verification and just ensure the user exists
    // In a real app, you'd verify the code sent via SMS
    const user = await airtableService.ensureUserExists(phoneNumber);
    
    res.json({
      success: true,
      user: {
        phoneNumber,
        createdAt: new Date(),
        lastActive: new Date(),
        verified: true
      }
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get user health logs
router.get('/health-logs', authenticate, async (req, res) => {
  try {
    const phoneNumber = req.user.phoneNumber;
    
    // Get exercise logs
    const exerciseLogsResult = await airtableService.getUserExerciseLogs(phoneNumber);
    
    // Get food logs
    const foodLogsResult = await airtableService.getUserFoodLogs(phoneNumber);
    
    if (!exerciseLogsResult.success || !foodLogsResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching logs'
      });
    }
    
    // Combine logs and sort by timestamp (newest first)
    const combinedLogs = [
      ...exerciseLogsResult.logs.map(log => ({ 
        ...log, 
        category: 'exercise',
        processed: {
          exercise: {
            duration: log.duration || 0,
            type: log.type || 'exercise',
            distance: log.distance || ''
          }
        }
      })),
      ...foodLogsResult.logs.map(log => ({
        ...log,
        category: 'food',
        processed: {
          food: {
            description: log.foodItems || ''
          }
        }
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      success: true,
      logs: combinedLogs
    });
  } catch (error) {
    console.error('Error fetching health logs:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get weekly summary
router.get('/weekly-summary', authenticate, async (req, res) => {
  try {
    const phoneNumber = req.user.phoneNumber;
    
    // Get the user's status for the last 7 days
    const status = await airtableService.getUserStatus(phoneNumber, 7);
    
    if (!status.success) {
      return res.status(500).json({
        success: false,
        message: 'Error generating weekly summary'
      });
    }
    
    // Calculate exercise types
    const exerciseTypes = {};
    status.exerciseLogs.forEach(log => {
      const type = log.type || 'unknown';
      exerciseTypes[type] = (exerciseTypes[type] || 0) + 1;
    });
    
    // Create a proper weekly summary
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    
    const summary = {
      exerciseCount: status.summary.exerciseCount,
      averageExerciseDuration: status.summary.averageDuration,
      exerciseTypes,
      foodLogCount: status.summary.foodLogCount,
      startDate,
      endDate
    };
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching weekly summary:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Generate PDF report (note: doesn't actually create a PDF in the MVP)
router.post('/reports/generate', authenticate, async (req, res) => {
  try {
    const phoneNumber = req.user.phoneNumber;
    const { startDate, endDate } = req.body;
    
    // In a real app, you'd generate and return a PDF
    // For now, we'll just return success
    
    res.json({
      success: true,
      reportUrl: null, // No actual PDF generated in MVP
      message: 'Report generated successfully. Check your WhatsApp for the report.'
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;