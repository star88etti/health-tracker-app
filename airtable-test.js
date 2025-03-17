// test-airtable.js - Run with: node test-airtable.js
require('dotenv').config();
const Airtable = require('airtable');

// Print all environment variables for debugging
console.log('Environment variables:');
console.log('AIRTABLE_PERSONAL_ACCESS_TOKEN:', process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN ? '[Set]' : '[Not set]');
console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID);
console.log('AIRTABLE_USERS_TABLE_ID:', process.env.AIRTABLE_USERS_TABLE_ID || '[Using default]');
console.log('AIRTABLE_EXERCISE_LOGS_TABLE_ID:', process.env.AIRTABLE_EXERCISE_LOGS_TABLE_ID || '[Using default]');
console.log('AIRTABLE_FOOD_LOGS_TABLE_ID:', process.env.AIRTABLE_FOOD_LOGS_TABLE_ID || '[Using default]');

// Table names (from environment or defaults)
const tables = {
  users: process.env.AIRTABLE_USERS_TABLE_ID || 'Users',
  exerciseLogs: process.env.AIRTABLE_EXERCISE_LOGS_TABLE_ID || 'Exercise Logs',
  foodLogs: process.env.AIRTABLE_FOOD_LOGS_TABLE_ID || 'Food Logs'
};

async function testAirtable() {
  try {
    console.log('\n--- Testing Airtable Connection ---');
    
    // Configure Airtable
    Airtable.configure({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN,
      endpointUrl: 'https://api.airtable.com'
    });
    
    const base = Airtable.base(process.env.AIRTABLE_BASE_ID);
    
    // Test each table
    for (const [key, tableName] of Object.entries(tables)) {
      try {
        console.log(`\nTesting table: ${tableName}`);
        
        // Try to get schema
        const result = await base(tableName).select({ maxRecords: 1 }).firstPage();
        console.log(`✅ Successfully connected to ${tableName} table`);
        
        // Print field names from the first record
        if (result.length > 0) {
          const fields = Object.keys(result[0].fields);
          console.log(`Fields in ${tableName}:`, fields);
        } else {
          console.log(`Table ${tableName} exists but has no records`);
        }
      } catch (error) {
        console.error(`❌ Error accessing ${tableName} table:`, error.message);
      }
    }
    
    // Try to create a test record in Exercise Logs
    try {
      console.log('\nTesting record creation in Exercise Logs table...');
      const testRecord = await base(tables.exerciseLogs).create([
        {
          fields: {
            timestamp: new Date().toISOString(),
            userId: 'test-user-' + Date.now(),
            duration: 30,
            type: 'test-exercise',
            distance: '1 mile',
            rawMessage: 'Test message from test script'
          }
        }
      ]);
      
      console.log('✅ Successfully created test record:', testRecord[0].id);
      
      // Delete the test record to clean up
      await base(tables.exerciseLogs).destroy([testRecord[0].id]);
      console.log('✅ Successfully deleted test record');
    } catch (error) {
      console.error('❌ Error creating test record:', error.message);
      if (error.message.includes('invalid table') || error.message.includes('not found')) {
        console.error('This error suggests the table does not exist or has a different name');
      } else if (error.message.includes('permission')) {
        console.error('This error suggests permission issues with your Airtable token');
      } else if (error.message.includes('fields')) {
        console.error('This error suggests the field structure does not match what the code expects');
      }
    }
    
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

testAirtable();