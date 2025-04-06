const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.0-pro',  // Updated model name
  generationConfig: {
    maxOutputTokens: config.gemini.maxOutputTokens,
    temperature: config.gemini.temperature,
    topP: config.gemini.topP,
    topK: config.gemini.topK
  }
});

/**
 * Classifies a message using Gemini
 * @param {string} message - The message to classify
 * @returns {Promise<Object>} - Classification results
 */
async function classifyMessage(message) {
  try {
    console.log('Classifying message with Gemini:', message);
    
    const prompt = `
You are a health tracking assistant that extracts information from user messages.

The message is: "${message}"

Extract the following information if present:
1. Is this about exercise or food?
2. If exercise: What was the duration? What was the distance (if mentioned)? What type of exercise?
3. If food: What food items were consumed?
4. Is this a "status" request?

Return ONLY a JSON object with the following structure:
{
  "type": "exercise" OR "food" OR "status" OR "unknown",
  "duration_minutes": number (if exercise, can be estimated based on typical pace if only distance is given),
  "distance": text (if mentioned),
  "exercise_type": text (if mentioned, default to "running" for messages about running/jogging/ran),
  "food_items": text (if food),
  "is_status_request": true/false,
  "confidence": 0-100
}

Be generous in interpretation. If someone mentions running, classify it as exercise even if details are minimal.

EXAMPLES:
For "I ran 5 miles today" → {"type": "exercise", "duration_minutes": 45, "distance": "5 miles", "exercise_type": "running", "food_items": "", "is_status_request": false, "confidence": 95}
For "I ran" → {"type": "exercise", "duration_minutes": null, "distance": "", "exercise_type": "running", "food_items": "", "is_status_request": false, "confidence": 90}
For "I had oatmeal for breakfast" → {"type": "food", "duration_minutes": null, "distance": "", "exercise_type": "", "food_items": "oatmeal", "is_status_request": false, "confidence": 95}
For "status" → {"type": "status", "duration_minutes": null, "distance": "", "exercise_type": "", "food_items": "", "is_status_request": true, "confidence": 99}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    console.log('Gemini classification response:', content);
    
    const resultJson = JSON.parse(content);
    return resultJson;
  } catch (error) {
    console.error('Error classifying message with Gemini:', error);
    
    // Enhanced fallback: check for status request first
    const lowerMessage = message.toLowerCase();
    
    // Check for status request
    if (lowerMessage.includes('status') || lowerMessage.includes('report') || 
        lowerMessage === 'status' || lowerMessage === 'report') {
      console.log('Fallback: Detected status request');
      return {
        type: 'status',
        is_status_request: true,
        exercise_type: '',
        duration_minutes: null,
        distance: null,
        food_items: '',
        confidence: 85,
        fallback: true
      };
    }
    
    // Check for exercise-related terms
    if (lowerMessage.includes('ran') || lowerMessage.includes('run') || 
        lowerMessage.includes('jog') || lowerMessage.includes('exercise') ||
        lowerMessage.includes('workout') || lowerMessage.includes('mile') ||
        lowerMessage.includes('gym') || lowerMessage.includes('training') ||
        lowerMessage.includes('walked') || lowerMessage.includes('walk')) {
      console.log('Fallback: Detected exercise-related terms in message');
      
      // Try to extract duration using regex
      let duration = null;
      const durationMatch = lowerMessage.match(/(\d+)\s*(?:minute|min|minutes)/i);
      if (durationMatch) {
        duration = parseInt(durationMatch[1], 10);
      }
      
      // Try to extract distance using regex
      let distance = null;
      const distanceMatch = lowerMessage.match(/(\d+(?:\.\d+)?)\s*(?:mile|miles|km|kilometer|kilometers)/i);
      if (distanceMatch) {
        distance = distanceMatch[0];
      }
      
      // Determine exercise type
      let exerciseType = 'running';
      if (lowerMessage.includes('walk')) exerciseType = 'walking';
      if (lowerMessage.includes('swim')) exerciseType = 'swimming';
      if (lowerMessage.includes('bik')) exerciseType = 'biking';
      if (lowerMessage.includes('gym') || lowerMessage.includes('lift')) exerciseType = 'strength training';
      
      return {
        type: 'exercise',
        is_status_request: false,
        exercise_type: exerciseType,
        duration_minutes: duration,
        distance: distance,
        food_items: '',
        confidence: 75,
        fallback: true
      };
    }
    
    // Check for food-related terms
    if (lowerMessage.includes('ate') || lowerMessage.includes('eat') || 
        lowerMessage.includes('food') || lowerMessage.includes('meal') ||
        lowerMessage.includes('breakfast') || lowerMessage.includes('lunch') || 
        lowerMessage.includes('dinner') || lowerMessage.includes('snack') ||
        lowerMessage.includes('salad') || lowerMessage.includes('fruit') ||
        lowerMessage.includes('vegetable') || lowerMessage.includes('protein') ||
        lowerMessage.includes('had') && 
          (lowerMessage.includes('for breakfast') || 
           lowerMessage.includes('for lunch') || 
           lowerMessage.includes('for dinner'))) {
      
      console.log('Fallback: Detected food-related terms in message');
      
      // Extract the food items - just use the whole message as food items
      // Strip common prefixes like "I had" or "I ate"
      let foodItems = message;
      foodItems = foodItems.replace(/^i (had|ate|consumed|eat)/i, '').trim();
      foodItems = foodItems.replace(/^(had|ate|consumed)/i, '').trim();
      foodItems = foodItems.replace(/for (breakfast|lunch|dinner|snack)/i, '').trim();
      
      return {
        type: 'food',
        is_status_request: false,
        exercise_type: '',
        duration_minutes: null,
        distance: null,
        food_items: foodItems,
        confidence: 75,
        fallback: true
      };
    }
    
    // Default fallback if nothing else matches
    return {
      type: 'unknown',
      is_status_request: false,
      confidence: 0,
      error: error.message
    };
  }
}

module.exports = {
  classifyMessage
}; 