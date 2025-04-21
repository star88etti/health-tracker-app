const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./config');

async function testGeminiConnection() {
  try {
    console.log('Testing Gemini API connection...');
    console.log('API Key (first 5 chars):', config.gemini.apiKey.substring(0, 5));
    
    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    console.log('Initialized GoogleGenerativeAI');
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-lite',
      generationConfig: {
        temperature: 0.1,
        topP: 1,
        topK: 1,
        maxOutputTokens: 2048,
      }
    });
    console.log('Got model instance');
    
    const parts = [{
      text: `Return a JSON object with exercise information in this format:
{
  "type": "exercise",
  "duration_minutes": 45,
  "distance": "",
  "exercise_type": "yoga",
  "food_items": "",
  "is_status_request": false,
  "confidence": 95
}

The message is: "I did yoga for 45 minutes"

Return ONLY the JSON object, no markdown, no code blocks.`
    }];
    
    console.log('Sending prompt...');
    const result = await model.generateContent(parts);
    console.log('Got result');
    
    const response = await result.response;
    console.log('Got response');
    
    let text = response.text();
    console.log('Raw response:', text);
    
    // Clean up the response - remove any markdown or code block formatting
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/`/g, '').trim();
    console.log('Cleaned response:', text);
    
    // Try parsing the JSON
    const json = JSON.parse(text);
    console.log('Successfully parsed JSON:', json);
    
    return json;
  } catch (error) {
    console.error('Error testing Gemini:', error);
    if (error.message && error.message.includes('API key not valid')) {
      console.error('API key validation failed. Please check if the key is valid and has the necessary permissions.');
    }
    throw error;
  }
}

// Export the test function
module.exports = {
  testGeminiConnection
}; 