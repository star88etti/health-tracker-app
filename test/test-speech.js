const fs = require('fs');
const path = require('path');
const { transcribeAudio } = require('../services/speechService');

async function testSpeechService() {
  try {
    console.log('Starting speech service test...');
    
    // Test with an OGG file (you'll need to provide the actual test file)
    const audioPath = path.join(__dirname, 'audio', 'test-message.ogg');
    const audioBuffer = fs.readFileSync(audioPath);
    
    console.log('Audio file loaded, size:', audioBuffer.length);
    
    // Attempt transcription
    const transcription = await transcribeAudio(audioBuffer, 'ogg');
    
    console.log('\nTranscription result:');
    console.log('-------------------');
    console.log(transcription);
    console.log('-------------------');
    
    return transcription;
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

// Run the test
testSpeechService()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 