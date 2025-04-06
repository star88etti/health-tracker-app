import { GoogleGenerativeAI } from '@google/generative-ai';
import config from './config.js';

// Initialize Gemini API with the latest configuration
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

const model = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-pro-002',
  generationConfig: {
    temperature: 0.1,
    topP: 1,
    topK: 1,
    maxOutputTokens: 2048,
  }
});

async function testClassification(message) {
  try {
    console.log('Testing message:', message);
    
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
    console.error('Error testing classification:', error);
    throw error;
  }
}

// Test messages
const testMessages = [
  "i did pilates for 20 seconds",
  "I did pilates for 45 minutes",
  "I had a protein shake after pilates",
  "Just finished a pilates class"
];

async function runTests() {
  for (const message of testMessages) {
    try {
      const result = await testClassification(message);
      console.log('\nTest message:', message);
      console.log('Result:', JSON.stringify(result, null, 2));
      console.log('----------------------------------------');
    } catch (error) {
      console.error('Error testing message:', message, error);
    }
  }
}

runTests();
