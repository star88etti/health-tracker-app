const { SpeechClient } = require('@google-cloud/speech');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Initialize Speech-to-Text client
let speechClient;

// If credentials are provided as JSON string in environment variable
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const credentialsPath = path.join(os.tmpdir(), 'google-credentials.json');
  fs.writeFileSync(credentialsPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  speechClient = new SpeechClient({ keyFilename: credentialsPath });
} else {
  // Fall back to Application Default Credentials
  speechClient = new SpeechClient();
}

/**
 * Convert audio buffer to WAV format suitable for Google Speech-to-Text
 * @param {Buffer} audioBuffer - Raw audio buffer
 * @param {string} inputFormat - Input audio format (e.g., 'ogg')
 * @returns {Promise<string>} - Path to converted WAV file
 */
async function convertAudioToWav(audioBuffer, inputFormat) {
  const tempInputPath = path.join(os.tmpdir(), `input-${Date.now()}.${inputFormat}`);
  const tempOutputPath = path.join(os.tmpdir(), `output-${Date.now()}.wav`);
  
  try {
    console.log('Converting audio file...');
    console.log('Input format:', inputFormat);
    console.log('Input buffer size:', audioBuffer.length);
    
    // Write the input buffer to a temporary file
    await writeFile(tempInputPath, audioBuffer);
    console.log('Temporary input file created:', tempInputPath);
    
    // Convert to WAV using ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(tempInputPath)
        .toFormat('wav')
        .outputOptions([
          '-acodec pcm_s16le',
          '-ac 1',
          '-ar 16000'
        ])
        .save(tempOutputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('FFmpeg progress:', progress);
        })
        .on('end', () => {
          console.log('FFmpeg conversion complete');
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        });
    });
    
    console.log('Converted file size:', fs.statSync(tempOutputPath).size);
    return tempOutputPath;
  } catch (error) {
    console.error('Error in convertAudioToWav:', error);
    throw error;
  } finally {
    // Clean up the input file
    try {
      await unlink(tempInputPath);
      console.log('Cleaned up input file');
    } catch (error) {
      console.error('Error cleaning up input file:', error);
    }
  }
}

/**
 * Transcribe audio to text
 * @param {Buffer} audioBuffer - Raw audio buffer
 * @param {string} inputFormat - Input audio format (e.g., 'ogg')
 * @param {string} languageCode - Language code (default: 'en-US')
 * @returns {Promise<string>} - Transcribed text
 */
async function transcribeAudio(audioBuffer, inputFormat, languageCode = 'en-US') {
  let wavFilePath;
  
  try {
    console.log('\nStarting transcription process...');
    console.log('Language code:', languageCode);
    
    // Convert audio to WAV format
    wavFilePath = await convertAudioToWav(audioBuffer, inputFormat);
    
    // Read the converted WAV file
    const audioBytes = fs.readFileSync(wavFilePath).toString('base64');
    console.log('WAV file converted to base64, length:', audioBytes.length);
    
    // Configure the recognition request
    const audio = {
      content: audioBytes,
    };
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: languageCode,
      model: 'default',
      useEnhanced: true,
      metadata: {
        interactionType: 'VOICE_MESSAGE',
        microphoneDistance: 'NEARFIELD',
        recordingDeviceType: 'SMARTPHONE',
      }
    };
    
    console.log('Sending request to Google Speech-to-Text API...');
    console.log('Recognition config:', JSON.stringify(config, null, 2));
    
    // Perform the transcription
    const [response] = await speechClient.recognize({ audio, config });
    console.log('API Response:', JSON.stringify(response, null, 2));
    
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    
    console.log('Transcription successful');
    return transcription;
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    throw error;
  } finally {
    // Clean up the WAV file
    if (wavFilePath) {
      try {
        await unlink(wavFilePath);
        console.log('Cleaned up WAV file');
      } catch (error) {
        console.error('Error cleaning up WAV file:', error);
      }
    }
  }
}

module.exports = {
  transcribeAudio
}; 