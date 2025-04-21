const { SpeechClient } = require('@google-cloud/speech');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Initialize Speech-to-Text client
const speechClient = new SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

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
    // Write the input buffer to a temporary file
    await writeFile(tempInputPath, audioBuffer);
    
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
        .on('end', resolve)
        .on('error', reject);
    });
    
    return tempOutputPath;
  } finally {
    // Clean up the input file
    try {
      await unlink(tempInputPath);
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
    // Convert audio to WAV format
    wavFilePath = await convertAudioToWav(audioBuffer, inputFormat);
    
    // Read the converted WAV file
    const audioBytes = fs.readFileSync(wavFilePath).toString('base64');
    
    // Configure the recognition request
    const audio = {
      content: audioBytes,
    };
    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: languageCode,
      model: 'default', // Use 'phone_call' for audio from phone calls
      useEnhanced: true, // Use enhanced model
      metadata: {
        interactionType: 'VOICE_MESSAGE',
        microphoneDistance: 'NEARFIELD',
        recordingDeviceType: 'SMARTPHONE',
      }
    };
    
    // Perform the transcription
    const [response] = await speechClient.recognize({ audio, config });
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    
    console.log('Transcription successful:', transcription);
    return transcription;
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    throw error;
  } finally {
    // Clean up the WAV file
    if (wavFilePath) {
      try {
        await unlink(wavFilePath);
      } catch (error) {
        console.error('Error cleaning up WAV file:', error);
      }
    }
  }
}

module.exports = {
  transcribeAudio
}; 