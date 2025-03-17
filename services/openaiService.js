// OpenAI service for message classification
const { OpenAI } = require('openai');
const config = require('../config');

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

/**
 * Classifies a message using OpenAI
 * @param {string} message - The message to classify
 * @returns {Promise<Object>} - Classification results
 */
async function classifyMessage(message) {
  try {
    console.log('Classifying message with OpenAI:', message);
    
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

    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature,
      response_format: { type: 'json_object' }
    });

    // Extract and parse the JSON response
    const content = response.choices[0].message.content;
    console.log('OpenAI classification response:', content);
    
    const result = JSON.parse(content);
    return result;
  } catch (error) {
    console.error('Error classifying message with OpenAI:', error);
    
    // For messages about running or exercise, provide a fallback
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('ran') || lowerMessage.includes('run') || 
        lowerMessage.includes('jog') || lowerMessage.includes('exercise') ||
        lowerMessage.includes('workout') || lowerMessage.includes('mile')) {
      console.log('Fallback: Detected exercise-related terms in message');
      return {
        type: 'exercise',
        is_status_request: false,
        exercise_type: 'running',
        duration_minutes: null,
        distance: null,
        confidence: 70,
        fallback: true
      };
    }
    
    // Return a default fallback response
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