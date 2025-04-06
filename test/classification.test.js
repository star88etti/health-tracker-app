const axios = require('axios');

const TEST_PHONE = 'whatsapp:+1234567890';
const WEBHOOK_URL = 'https://health-tracker-new-app-7de8aa984308.herokuapp.com/webhook/message';

const testCases = [
  {
    description: 'Simple exercise - Pilates',
    message: 'I did pilates for 45 minutes',
    expectedType: 'exercise',
    expectedExerciseType: 'pilates',
    expectedDuration: 45
  },
  {
    description: 'Exercise with food - Pilates and protein shake',
    message: 'I had a protein shake after pilates',
    expectedType: 'food',
    expectedFoodItems: ['protein shake']
  },
  {
    description: 'Simple exercise - Pilates class',
    message: 'Just finished a pilates class',
    expectedType: 'exercise',
    expectedExerciseType: 'pilates'
  },
  {
    description: 'Exercise with duration and distance',
    message: 'I went for a 5k run which took me about 30 minutes',
    expectedType: 'exercise',
    expectedExerciseType: 'running',
    expectedDuration: 30,
    expectedDistance: '5k'
  },
  {
    description: 'Simple food log',
    message: 'Had a salad with grilled chicken for lunch',
    expectedType: 'food',
    expectedFoodItems: ['salad', 'grilled chicken']
  },
  {
    description: 'Status request',
    message: 'status',
    expectedIsStatusRequest: true
  }
];

async function runTests() {
  console.log('Starting classification tests...\n');
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.description}`);
    console.log(`Message: "${testCase.message}"`);
    
    try {
      const response = await axios.post(WEBHOOK_URL, {
        Body: testCase.message,
        From: TEST_PHONE
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // Log the raw response for debugging
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
      // Verify the classification
      const classification = response.data.classification;
      if (!classification) {
        console.error('❌ No classification in response\n');
        continue;
      }
      
      // Check type
      if (testCase.expectedType) {
        console.log(`Type: ${classification.type === testCase.expectedType ? '✅' : '❌'} (expected: ${testCase.expectedType}, got: ${classification.type})`);
      }
      
      // Check exercise details
      if (testCase.expectedExerciseType) {
        console.log(`Exercise type: ${classification.exercise_type === testCase.expectedExerciseType ? '✅' : '❌'} (expected: ${testCase.expectedExerciseType}, got: ${classification.exercise_type})`);
      }
      
      if (testCase.expectedDuration) {
        console.log(`Duration: ${classification.duration_minutes === testCase.expectedDuration ? '✅' : '❌'} (expected: ${testCase.expectedDuration}, got: ${classification.duration_minutes})`);
      }
      
      if (testCase.expectedDistance) {
        console.log(`Distance: ${classification.distance === testCase.expectedDistance ? '✅' : '❌'} (expected: ${testCase.expectedDistance}, got: ${classification.distance})`);
      }
      
      // Check food details
      if (testCase.expectedFoodItems) {
        const foodItems = classification.food_items.split(',').map(item => item.trim().toLowerCase());
        const matches = testCase.expectedFoodItems.every(expected => 
          foodItems.some(actual => actual.includes(expected.toLowerCase()))
        );
        console.log(`Food items: ${matches ? '✅' : '❌'} (expected: ${testCase.expectedFoodItems.join(', ')}, got: ${classification.food_items})`);
      }
      
      // Check status request
      if (testCase.expectedIsStatusRequest !== undefined) {
        console.log(`Status request: ${classification.is_status_request === testCase.expectedIsStatusRequest ? '✅' : '❌'} (expected: ${testCase.expectedIsStatusRequest}, got: ${classification.is_status_request})`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      if (error.request) {
        console.error('Request details:', error.request);
      }
    }
    
    console.log('----------------------------------------\n');
  }
}

// Make sure the server is running before executing tests
console.log('Make sure the backend server is running on http://localhost:3000');
console.log('Press Ctrl+C to cancel or any other key to start the tests...');

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', async (data) => {
  if (data[0] === 0x03) { // Ctrl+C
    process.exit();
  }
  process.stdin.setRawMode(false);
  process.stdin.pause();
  
  await runTests();
  process.exit();
}); 