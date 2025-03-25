// test-airtable-tables.js
require('dotenv').config();
const Airtable = require('airtable');

// Configure Airtable
Airtable.configure({
  apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
  endpointUrl: 'https://api.airtable.com'
});

async function listTables() {
  try {
    console.log('Base ID:', process.env.AIRTABLE_BASE_ID);
    const base = Airtable.base(process.env.AIRTABLE_BASE_ID);
    
    // Make a simple request to get metadata about the base
    const result = await base('').select().firstPage();
    console.log('Successfully connected to base');
    
    // Try to inspect base metadata
    console.log('Tables in this base:');
    // Note: This is a workaround as Airtable API doesn't directly expose table names
    // We'll try different methods to discover tables
    
    try {
      // Method 1: Try to get tables from base object (may not work)
      console.log(base._tables || 'No tables found through API');
    } catch (e) {
      console.log('Could not get tables through API');
    }
    
    console.log('\nPlease check your Airtable web interface for the exact table names.');
    console.log('Remember to use these names in your .env file:');
    console.log('AIRTABLE_USERS_TABLE_ID=YourUsersTableName');
    console.log('AIRTABLE_EXERCISE_LOGS_TABLE_ID=YourExerciseLogsTableName');
    console.log('AIRTABLE_FOOD_LOGS_TABLE_ID=YourFoodLogsTableName');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listTables();