// list-tables.js
require('dotenv').config();
const Airtable = require('airtable');

async function listTables() {
  try {
    console.log('Using Base ID:', process.env.AIRTABLE_BASE_ID);
    
    // Configure Airtable
    Airtable.configure({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
      endpointUrl: 'https://api.airtable.com'
    });
    
    // Create a schema request directly
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${process.env.AIRTABLE_BASE_ID}/tables`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    if (data.tables) {
      console.log('Tables in this base:');
      data.tables.forEach(table => {
        console.log(`- ${table.name} (ID: ${table.id})`);
      });
    } else {
      console.log('No tables found or error:', data);
    }
  } catch (error) {
    console.error('Error listing tables:', error);
  }
}

listTables();