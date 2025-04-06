const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

// Initialize Gemini API with the latest configuration
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

const model = genAI.getGenerativeModel({ 
  model: config.gemini.model,
  generationConfig: {
    temperature: config.gemini.temperature,
    topP: config.gemini.topP,
    topK: config.gemini.topK,
    maxOutputTokens: config.gemini.maxOutputTokens,
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
    
    const parts = [{
      text: `You are a health tracking assistant that extracts information from user messages.

The message is: "${message}"

Extract the following information if present:
1. Is this about exercise or food?
2. If exercise: What was the duration? What was the distance (if mentioned)? What type of exercise?
3. If food: What food items were consumed?
4. Is this a "status" request?

Return ONLY a plain JSON object, no markdown formatting, no code blocks, no backticks. The structure should be:
{
  "type": "exercise" OR "food" OR "status" OR "unknown",
  "duration_minutes": number (if exercise, can be estimated based on typical pace if only distance is given),
  "distance": text (if mentioned),
  "exercise_type": text (if mentioned, default to "running" for messages about running/jogging/ran),
  "food_items": text (if food),
  "is_status_request": true/false,
  "confidence": 0-100
}

Be generous in interpretation. If someone mentions any form of physical activity, classify it as exercise. Common exercise types include:
- running/jogging
- walking/hiking
- cycling/biking
- swimming
- yoga/pilates
- strength training/weight lifting
- dance/zumba
- martial arts/boxing
- crossfit/hiit
- team sports
- other physical activities

EXAMPLES:
"I did pilates for 45 minutes" should return:
{"type": "exercise", "duration_minutes": 45, "distance": "", "exercise_type": "pilates", "food_items": "", "is_status_request": false, "confidence": 95}

"I ran 5 miles today" should return:
{"type": "exercise", "duration_minutes": 45, "distance": "5 miles", "exercise_type": "running", "food_items": "", "is_status_request": false, "confidence": 95}

"I had oatmeal for breakfast" should return:
{"type": "food", "duration_minutes": null, "distance": "", "exercise_type": "", "food_items": "oatmeal", "is_status_request": false, "confidence": 95}

"status" should return:
{"type": "status", "duration_minutes": null, "distance": "", "exercise_type": "", "food_items": "", "is_status_request": true, "confidence": 99}

Return ONLY the JSON object, with no additional formatting, no markdown, no code blocks, no backticks.`
    }];

    const result = await model.generateContent(parts);
    const response = await result.response;
    let content = response.text();
    
    // Clean up the response - remove any markdown or code block formatting
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/`/g, '').trim();
    
    // Try to extract just the JSON object if there's any extra text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    console.log('Cleaned Gemini response:', content);
    
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
        lowerMessage.includes('walked') || lowerMessage.includes('walk') ||
        lowerMessage.includes('ride') || lowerMessage.includes('cycling') ||
        lowerMessage.includes('bike') || lowerMessage.includes('biking') ||
        lowerMessage.includes('pilates') || lowerMessage.includes('dance') ||
        lowerMessage.includes('zumba') || lowerMessage.includes('boxing') ||
        lowerMessage.includes('martial') || lowerMessage.includes('karate') ||
        lowerMessage.includes('taekwondo') || lowerMessage.includes('kickboxing') ||
        lowerMessage.includes('crossfit') || lowerMessage.includes('hiit') ||
        lowerMessage.includes('circuit') || lowerMessage.includes('sport')) {
      console.log('Fallback: Detected exercise-related terms in message');
      
      // Try to extract duration using regex
      let duration = null;
      const durationMatch = lowerMessage.match(/(\d+)\s*(?:minute|min|minutes|hr|hour|hours)/i);
      if (durationMatch) {
        duration = parseInt(durationMatch[1], 10);
        // Convert hours to minutes if needed
        if (lowerMessage.includes('hour')) {
          duration *= 60;
        }
      }
      
      // Try to extract distance using regex
      let distance = null;
      const distanceMatch = lowerMessage.match(/(\d+(?:\.\d+)?)\s*(?:mile|miles|k|km|kilometer|kilometers)/i);
      if (distanceMatch) {
        distance = distanceMatch[0];
      }
      
      // Determine exercise type
      let exerciseType = 'running';
      if (lowerMessage.includes('walk')) exerciseType = 'walking';
      if (lowerMessage.includes('swim')) exerciseType = 'swimming';
      if (lowerMessage.includes('bik') || lowerMessage.includes('ride') || lowerMessage.includes('cycl')) exerciseType = 'cycling';
      if (lowerMessage.includes('gym') || lowerMessage.includes('lift') || lowerMessage.includes('weight')) exerciseType = 'strength training';
      if (lowerMessage.includes('yoga')) exerciseType = 'yoga';
      if (lowerMessage.includes('pilates')) exerciseType = 'pilates';
      if (lowerMessage.includes('dance')) exerciseType = 'dance';
      if (lowerMessage.includes('zumba')) exerciseType = 'zumba';
      if (lowerMessage.includes('boxing') || lowerMessage.includes('kickboxing')) exerciseType = 'boxing';
      if (lowerMessage.includes('martial') || lowerMessage.includes('karate') || lowerMessage.includes('taekwondo')) exerciseType = 'martial arts';
      if (lowerMessage.includes('crossfit')) exerciseType = 'crossfit';
      if (lowerMessage.includes('hiit') || lowerMessage.includes('circuit')) exerciseType = 'hiit';
      if (lowerMessage.includes('hik')) exerciseType = 'hiking';
      
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
        lowerMessage.includes('shake') ||
        (lowerMessage.includes('had') && 
          (lowerMessage.includes('for breakfast') || 
           lowerMessage.includes('for lunch') || 
           lowerMessage.includes('for dinner') ||
           lowerMessage.includes('to eat') ||
           lowerMessage.includes('shake') ||
           !lowerMessage.includes('workout') &&
           !lowerMessage.includes('exercise') &&
           !lowerMessage.includes('session') &&
           !lowerMessage.includes('class')))) {
      
      // First check if this is actually about exercise
      if ((lowerMessage.includes('pilates') || lowerMessage.includes('yoga') ||
           lowerMessage.includes('workout') || lowerMessage.includes('exercise')) &&
          !lowerMessage.includes('shake') &&
          !lowerMessage.includes('after') &&
          !lowerMessage.includes('before')) {
        console.log('Fallback: Message contains food terms but is about exercise');
        // Handle as exercise instead
        return {
          type: 'exercise',
          is_status_request: false,
          exercise_type: lowerMessage.includes('pilates') ? 'pilates' : 
                        lowerMessage.includes('yoga') ? 'yoga' : 'exercise',
          duration_minutes: null,
          distance: null,
          food_items: '',
          confidence: 75,
          fallback: true
        };
      }
      
      console.log('Fallback: Detected food-related terms in message');
      
      // Extract the food items - just use the whole message as food items
      // Strip common prefixes like "I had" or "I ate"
      let foodItems = message;
      foodItems = foodItems.replace(/^i (had|ate|consumed|eat)/i, '').trim();
      foodItems = foodItems.replace(/^(had|ate|consumed)/i, '').trim();
      foodItems = foodItems.replace(/for (breakfast|lunch|dinner|snack)/i, '').trim();
      foodItems = foodItems.replace(/\b(before|after)\b.*?(workout|exercise|pilates|yoga|class|session)/i, '').trim();
      
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