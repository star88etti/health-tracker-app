const express = require('express');
const router = express.Router();
const { analyzeHealthData } = require('../services/openaiService');
const { appendHealthData } = require('../services/sheetsService');
const { sendHealthUpdate } = require('../services/twilioService');

router.post('/health-data', async (req, res) => {
    try {
        const healthData = req.body;
        
        // Store data in Google Sheets
        await appendHealthData(process.env.GOOGLE_SHEETS_ID, [
            new Date().toISOString(),
            JSON.stringify(healthData)
        ]);

        // Analyze data with OpenAI
        const analysis = await analyzeHealthData(healthData);

        // Send update via Twilio if phone number is provided
        if (healthData.phoneNumber) {
            await sendHealthUpdate(healthData.phoneNumber, analysis);
        }

        res.json({ success: true, analysis });
    } catch (error) {
        console.error('Error processing health data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; 