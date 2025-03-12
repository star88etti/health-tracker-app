const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function analyzeHealthData(data) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a health data analyst. Analyze the provided health data and give insights."
                },
                {
                    role: "user",
                    content: JSON.stringify(data)
                }
            ]
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error in OpenAI analysis:', error);
        throw error;
    }
}

module.exports = {
    analyzeHealthData
}; 