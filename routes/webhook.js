// Webhook route handlers
const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const airtableService = require('../services/airtableService');
const twilioService = require('../services/twilioService');
const axios = require('axios');

/**
 * Webhook endpoint for handling incoming messages
 */
router.post('/message', async (req, res) => {
  try {
    console.log('------------------------');
    console.log('Webhook request received:');
    console.log('Body:', JSON.stringify(req.body));
    console.log('------------------------');
    
    // For production, uncomment this to validate Twilio requests
    // if (!twilioService.validateRequest(req)) {
    //   return res.status(403).send('Forbidden');
    // }
    
    // Extract message info from the request
    const messageBody = req.body.Body || '';
    const from = req.body.From || '';
    const mediaUrl = req.body.MediaUrl0; // For voice messages
    
    // Extract user ID (phone number) from the "from" field
    // Twilio WhatsApp format: "whatsapp:+1234567890"
    const userId = from.replace('whatsapp:', '');
    
    let processedMessage = messageBody;
    
    // Handle voice messages
    if (mediaUrl && req.body.MediaContentType0 === 'audio/ogg') {
      console.log('Processing voice message from:', userId);
      try {
        // Download the voice message
        const response = await axios.get(mediaUrl, {
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`
          }
        });
        
        // Convert voice to text using Gemini's speech-to-text
        // Note: This is a placeholder - you'll need to implement actual speech-to-text
        // For now, we'll use a mock response
        processedMessage = "I ran 5 miles today"; // This would be the actual transcribed text
        
        console.log('Voice message processed:', processedMessage);
      } catch (error) {
        console.error('Error processing voice message:', error);
        const twimlResponse = twilioService.generateTwimlResponse("Sorry, I couldn't process your voice message. Please try sending a text message instead.");
        return res.type('text/xml').send(twimlResponse);
      }
    }
    
    console.log(`Received message from ${userId}: ${processedMessage}`);
    
    // Special handling for "status" keyword before using Gemini
    if (processedMessage.trim().toLowerCase() === 'status') {
      console.log('Direct status request detected');
      const statusResponse = await handleStatusRequest(userId);
      
      // For API testing, include classification in response
      const acceptHeader = req.headers['accept'] || req.headers['Accept'] || '';
      if (acceptHeader.toLowerCase().includes('application/json')) {
        console.log('Sending JSON response with classification');
        return res.json({
          success: true,
          classification: {
            type: 'status',
            is_status_request: true,
            exercise_type: '',
            duration_minutes: null,
            distance: null,
            food_items: '',
            confidence: 99
          },
          response: statusResponse
        });
      }
      
      // For Twilio webhook, return TwiML response
      console.log('Sending TwiML response');
      const twimlResponse = twilioService.generateTwimlResponse(statusResponse);
      return res.type('text/xml').send(twimlResponse);
    }
    
    // Ensure user exists in our database
    const user = await airtableService.ensureUserExists(userId);
    console.log('User info:', user);
    
    // Classify the message using Gemini
    const classification = await geminiService.classifyMessage(processedMessage);
    console.log('Message classification:', classification);
    
    // Handle the message based on its type
    let responseMessage = '';
    
    if (classification.is_status_request || classification.type === 'status') {
      // Handle status request
      console.log('Status request detected via classification');
      responseMessage = await handleStatusRequest(userId);
    } else if (classification.type === 'exercise') {
      // Handle exercise logging
      responseMessage = await handleExerciseLog(classification, userId, processedMessage);
    } else if (classification.type === 'food') {
      // Handle food logging
      responseMessage = await handleFoodLog(classification, userId, processedMessage);
    } else {
      // Handle unknown message type
      responseMessage = "I'm not sure what you meant. Please send a message about your exercise, food, or type 'status' for a report.";
    }
    
    // Send response back to user
    console.log(`Sending response to ${userId}: ${responseMessage}`);
    console.log('Headers:', req.headers); // Add this for debugging
    
    // For API testing, include classification in response
    const acceptHeader = req.headers['accept'] || req.headers['Accept'] || '';
    if (acceptHeader.toLowerCase().includes('application/json')) {
      console.log('Sending JSON response with classification');
      return res.json({
        success: true,
        classification,
        response: responseMessage
      });
    }
    
    // For Twilio webhook, return TwiML response
    console.log('Sending TwiML response');
    const twimlResponse = twilioService.generateTwimlResponse(responseMessage);
    res.type('text/xml').send(twimlResponse);
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Handle status request
 * @param {string} userId - User's phone number
 * @returns {Promise<string>} - Response message
 */
async function handleStatusRequest(userId) {
  try {
    console.log(`Processing status request for user: ${userId}`);
    
    // Get user status from Airtable
    const status = await airtableService.getUserStatus(userId);
    console.log('Status result:', JSON.stringify(status));
    
    if (!status.success) {
      console.error('Error getting status:', status.error);
      return "Sorry, I couldn't retrieve your status right now. Please try again later.";
    }
    
    // Format the status message
    const { summary, exerciseLogs, foodLogs } = status;
    
    // Build a simple text report
    let report = '📊 *Your Weekly Health Report* 📊\n\n';
    
    // Add summary section
    report += '*Weekly Summary:*\n';
    report += `• Exercise sessions: ${summary.exerciseCount} sessions\n`;
    report += `• Average duration: ${summary.averageDuration} minutes\n`;
    report += `• Food logs: ${summary.foodLogCount} entries\n\n`;
    
    // Add exercise logs (limited to 5 most recent)
    report += '*Recent Exercise Logs:*\n';
    if (exerciseLogs.length > 0) {
      exerciseLogs
        .sort((a, b) => b.date - a.date) // Sort by date descending
        .slice(0, 5) // Take the 5 most recent
        .forEach(log => {
          const date = log.date.toLocaleDateString();
          report += `• ${date}: ${log.duration} mins of ${log.type}${log.distance ? ` (${log.distance})` : ''}\n`;
        });
    } else {
      report += 'No exercise logs in the past week.\n';
    }
    report += '\n';
    
    // Add food logs (limited to 5 most recent)
    report += '*Recent Food Logs:*\n';
    if (foodLogs.length > 0) {
      foodLogs
        .sort((a, b) => b.date - a.date) // Sort by date descending
        .slice(0, 5) // Take the 5 most recent
        .forEach(log => {
          const date = log.date.toLocaleDateString();
          report += `• ${date}: ${log.foodItems}\n`;
        });
    } else {
      report += 'No food logs in the past week.\n';
    }
    
    return report;
  } catch (error) {
    console.error('Error generating status report:', error);
    return "Sorry, I couldn't create your status report. Please try again later.";
  }
}

/**
 * Handle exercise log
 * @param {Object} data - Exercise data
 * @param {string} userId - User's phone number
 * @param {string} rawMessage - Original message
 * @returns {Promise<string>} - Response message
 */
async function handleExerciseLog(data, userId, rawMessage) {
  try {
    // Log exercise to Airtable
    const result = await airtableService.logExercise(data, userId, rawMessage);
    
    if (!result.success) {
      console.error('Failed to log exercise:', result.error);
      return "Sorry, I couldn't log your exercise. Please try again later.";
    }
    
    // Build a confirmation message
    let confirmation = '✅ *Exercise Logged!* ✅\n\n';
    
    if (data.duration_minutes) {
      confirmation += `Duration: ${data.duration_minutes} minutes\n`;
    }
    
    if (data.exercise_type) {
      confirmation += `Type: ${data.exercise_type}\n`;
    }
    
    if (data.distance) {
      confirmation += `Distance: ${data.distance}\n`;
    }
    
    confirmation += '\nKeep up the good work! 💪';
    
    return confirmation;
  } catch (error) {
    console.error('Error logging exercise:', error);
    return "Sorry, I couldn't log your exercise. Please try again later.";
  }
}

/**
 * Handle food log
 * @param {Object} data - Food data
 * @param {string} userId - User's phone number
 * @param {string} rawMessage - Original message
 * @returns {Promise<string>} - Response message
 */
async function handleFoodLog(data, userId, rawMessage) {
  try {
    // Log food to Airtable
    const result = await airtableService.logFood(data, userId, rawMessage);
    
    if (!result.success) {
      console.error('Failed to log food:', result.error);
      return "Sorry, I couldn't log your food. Please try again later.";
    }
    
    // Build a confirmation message
    let confirmation = '✅ *Food Logged!* ✅\n\n';
    
    if (data.food_items) {
      confirmation += `Food: ${data.food_items}\n`;
    }
    
    confirmation += '\nThanks for logging your meal! 🍎';
    
    return confirmation;
  } catch (error) {
    console.error('Error logging food:', error);
    return "Sorry, I couldn't log your food. Please try again later.";
  }
}

module.exports = router;