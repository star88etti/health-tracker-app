const { google } = require('googleapis');
require('dotenv').config();

const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SHEETS_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function appendHealthData(spreadsheetId, data) {
    try {
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:Z',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [data]
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error appending to Google Sheets:', error);
        throw error;
    }
}

module.exports = {
    appendHealthData
}; 