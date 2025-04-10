// Airtable service for data storage
const Airtable = require('airtable');
const config = require('../config');

// Initialize Airtable with Personal Access Token
console.log('Configuring Airtable with baseId:', config.airtable.baseId);
console.log('Using tables:', JSON.stringify(config.airtable.tables));

try {
  Airtable.configure({
    apiKey: config.airtable.personalAccessToken,
    endpointUrl: 'https://api.airtable.com'
  });
} catch (error) {
  console.error('Error initializing Airtable:', error);
}

// Get base with error handling
function getBase() {
  try {
    return Airtable.base(config.airtable.baseId);
  } catch (error) {
    console.error('Error getting Airtable base:', error);
    throw new Error(`Failed to get Airtable base: ${error.message}`);
  }
}

// Format date for Airtable - converts to YYYY-MM-DD format
function formatDateForAirtable(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

/**
 * Log exercise data to Airtable
 * @param {Object} data - Exercise data
 * @param {string} userId - User's phone number
 * @param {string} rawMessage - Original message
 * @returns {Promise<Object>} - Result of the operation
 */
async function logExercise(data, userId, rawMessage) {
  try {
    console.log('Logging exercise to Airtable:', { data, userId });
    
    // Validate required data
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const base = getBase();
    const tableName = config.airtable.tables.exerciseLogs;
    console.log(`Using table: ${tableName}`);
    
    // Try to parse duration and distance from the message if not provided
    let duration = data.duration_minutes || 0;
    let distance = data.distance || '';
    
    // Simple regex extraction for duration and distance if not provided
    if (!duration && rawMessage) {
      const durationMatch = rawMessage.match(/(\d+)\s*(?:minute|min|minutes)/i);
      if (durationMatch) {
        duration = parseInt(durationMatch[1], 10);
      }
    }
    
    if (!distance && rawMessage) {
      const distanceMatch = rawMessage.match(/(\d+(?:\.\d+)?)\s*(?:mile|miles|km|kilometer|kilometers)/i);
      if (distanceMatch) {
        distance = distanceMatch[0];
      }
    }
    
    // Create record object with safe defaults and formatted date
    const fields = {
      timestamp: formatDateForAirtable(new Date()),  // Format as YYYY-MM-DD
      userId: userId,
      duration: duration,
      type: data.exercise_type || 'exercise',
      distance: distance,
      rawMessage: rawMessage || ''
    };
    
    console.log('Creating Airtable record with fields:', fields);
    
    const result = await base(tableName).create([{ fields }]);
    
    console.log('Successfully created Airtable record:', result[0].id);
    
    return {
      success: true,
      recordId: result[0].id
    };
  } catch (error) {
    console.error('Error logging exercise to Airtable:', error);
    // Show more details about the error
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      config: {
        baseId: config.airtable.baseId,
        table: config.airtable.tables.exerciseLogs
      }
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Log food data to Airtable
 * @param {Object} data - Food data
 * @param {string} userId - User's phone number
 * @param {string} rawMessage - Original message
 * @returns {Promise<Object>} - Result of the operation
 */
async function logFood(data, userId, rawMessage) {
  try {
    console.log('Logging food to Airtable:', { data, userId });
    
    // Validate required data
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const base = getBase();
    const tableName = config.airtable.tables.foodLogs;
    console.log(`Using table: ${tableName}`);
    
    // Create record object with safe defaults
    const fields = {
      timestamp: formatDateForAirtable(new Date()),  // Format as YYYY-MM-DD
      userId: userId,
      foodItems: data.food_items || '',
      rawMessage: rawMessage || ''
    };
    
    console.log('Creating Airtable record with fields:', fields);
    
    const result = await base(tableName).create([{ fields }]);
    
    console.log('Successfully created Airtable record:', result[0].id);
    
    return {
      success: true,
      recordId: result[0].id
    };
  } catch (error) {
    console.error('Error logging food to Airtable:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      config: {
        baseId: config.airtable.baseId,
        table: config.airtable.tables.foodLogs
      }
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}


/**
 * Get user's exercise and food logs for status report
 * @param {string} userId - User's phone number
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} - User's logs and summary
 */
async function getUserStatus(userId, days = 7) {
  try {
    console.log(`Getting status for user ${userId} for the past ${days} days`);
    
    if (!userId) {
      console.error('No userId provided for getUserStatus');
      return {
        success: false,
        error: 'User ID is required'
      };
    }
    
    // Calculate date threshold (7 days ago)
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const thresholdString = formatDateForAirtable(dateThreshold);
    
    console.log(`Looking for records since ${thresholdString}`);
    
    const base = getBase();
    
    // Get exercise logs - with additional logging
    console.log(`Querying ${config.airtable.tables.exerciseLogs} table for user ${userId}`);
    try {
      // First check if the table exists and is accessible
      const testQuery = await base(config.airtable.tables.exerciseLogs)
        .select({ maxRecords: 1 })
        .firstPage();
      console.log(`Exercise logs table test query successful, found ${testQuery.length} records`);
    } catch (err) {
      console.error(`Error accessing exercise logs table: ${err.message}`);
    }
    
    // Proceed with the actual query
    let exerciseRecords = [];
    try {
      exerciseRecords = await base(config.airtable.tables.exerciseLogs)
        .select({
          filterByFormula: `{userId} = '${userId}'` // Simplified formula without date filter for testing
        })
        .all();
      
      console.log(`Found ${exerciseRecords.length} total exercise records for user`);
      
      // Filter by date in JavaScript instead of Airtable formula to avoid formula issues
      exerciseRecords = exerciseRecords.filter(record => {
        const recordDate = new Date(record.get('timestamp'));
        return recordDate >= dateThreshold;
      });
      
      console.log(`Found ${exerciseRecords.length} exercise records within date range`);
    } catch (err) {
      console.error(`Error retrieving exercise logs: ${err.message}`);
      exerciseRecords = [];
    }
    
    // Get food logs with similar approach
    console.log(`Querying ${config.airtable.tables.foodLogs} table for user ${userId}`);
    let foodRecords = [];
    try {
      foodRecords = await base(config.airtable.tables.foodLogs)
        .select({
          filterByFormula: `{userId} = '${userId}'` // Simplified formula
        })
        .all();
      
      console.log(`Found ${foodRecords.length} total food records for user`);
      
      // Filter by date in JavaScript
      foodRecords = foodRecords.filter(record => {
        const recordDate = new Date(record.get('timestamp'));
        return recordDate >= dateThreshold;
      });
      
      console.log(`Found ${foodRecords.length} food records within date range`);
    } catch (err) {
      console.error(`Error retrieving food logs: ${err.message}`);
      foodRecords = [];
    }
    
    // Process exercise logs - with extra error handling
    const exerciseLogs = [];
    for (const record of exerciseRecords) {
      try {
        exerciseLogs.push({
          date: new Date(record.get('timestamp')),
          duration: parseInt(record.get('duration')) || 0,
          type: record.get('type') || 'Unknown',
          distance: record.get('distance') || ''
        });
      } catch (err) {
        console.error(`Error processing exercise record: ${err.message}`);
      }
    }
    
    // Process food logs - with extra error handling
    const foodLogs = [];
    for (const record of foodRecords) {
      try {
        foodLogs.push({
          date: new Date(record.get('timestamp')),
          foodItems: record.get('foodItems') || 'Unknown'
        });
      } catch (err) {
        console.error(`Error processing food record: ${err.message}`);
      }
    }
    
    // Calculate summary statistics
    const totalExerciseSessions = exerciseLogs.length;
    
    // Calculate average duration (if available)
    let averageDuration = 0;
    const sessionsWithDuration = exerciseLogs.filter(log => log.duration > 0);
    if (sessionsWithDuration.length > 0) {
      const totalDuration = sessionsWithDuration.reduce((sum, log) => sum + log.duration, 0);
      averageDuration = Math.round(totalDuration / sessionsWithDuration.length);
    }
    
    console.log('Status report generated successfully');
    
    // Return data and summary
    return {
      success: true,
      summary: {
        exerciseCount: totalExerciseSessions,
        averageDuration,
        foodLogCount: foodLogs.length
      },
      exerciseLogs,
      foodLogs
    };
  } catch (error) {
    console.error('Error getting user status from Airtable:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      config: {
        baseId: config.airtable.baseId,
        tables: config.airtable.tables
      }
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Ensure user exists in the users table
 * @param {string} userId - User's phone number
 * @returns {Promise<Object>} - User info
 */
async function ensureUserExists(userId) {
  try {
    console.log(`Ensuring user exists: ${userId}`);
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const base = getBase();
    const tableName = config.airtable.tables.users;
    
    // Check if user exists
    console.log(`Checking if user exists in ${tableName} table`);
    const existingUsers = await base(tableName)
      .select({
        filterByFormula: `{userId} = '${userId}'`
      })
      .all();
    
    if (existingUsers.length === 0) {
      // User doesn't exist, create new user
      console.log(`User ${userId} not found, creating new user`);
      
      const newUser = await base(tableName).create([
        {
          fields: {
            userId: userId,
            name: '',
            onboardingComplete: false,
            exerciseGoal: 3,
            foodLogGoal: 1
          }
        }
      ]);
      
      console.log(`Created new user with ID: ${newUser[0].id}`);
      
      return {
        userId,
        isNew: true,
        exerciseGoal: 3,
        foodLogGoal: 1,
        recordId: newUser[0].id
      };
    }
    
    // Return existing user info
    const userRecord = existingUsers[0];
    console.log(`Found existing user with record ID: ${userRecord.id}`);
    
    return {
      userId,
      isNew: false,
      exerciseGoal: userRecord.get('exerciseGoal') || 3,
      foodLogGoal: userRecord.get('foodLogGoal') || 1,
      recordId: userRecord.id
    };
  } catch (error) {
    console.error('Error ensuring user exists in Airtable:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: userId,
      config: {
        baseId: config.airtable.baseId,
        table: config.airtable.tables.users
      }
    });
    
    // Return a default user object even if there was an error
    return {
      userId,
      isNew: false,
      exerciseGoal: 3,
      foodLogGoal: 1,
      error: error.message
    };
  }
}

/**
 * Get exercise logs for a specific user
 * @param {string} userId - User's phone number
 * @param {number} days - Optional number of days to look back (default: all logs)
 * @returns {Promise<Object>} - User's exercise logs
 */
async function getUserExerciseLogs(userId, days = null) {
  try {
    console.log(`Getting exercise logs for user ${userId}`);
    
    if (!userId) {
      console.error('No userId provided for getUserExerciseLogs');
      return {
        success: false,
        error: 'User ID is required'
      };
    }
    
    const base = getBase();
    const tableName = config.airtable.tables.exerciseLogs;
    
    // Set up filter formula
    let filterFormula = `{userId} = '${userId}'`;
    
    // Add date filter if specified
    if (days) {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      const thresholdString = formatDateForAirtable(dateThreshold);
      filterFormula = `AND(${filterFormula}, {timestamp} >= '${thresholdString}')`;
    }
    
    // Query Airtable
    const records = await base(tableName)
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: 'timestamp', direction: 'desc' }]
      })
      .all();
    
    console.log(`Found ${records.length} exercise logs for user ${userId}`);
    
    // Process records
    const logs = records.map(record => ({
      id: record.id,
      timestamp: record.get('timestamp'),
      duration: parseInt(record.get('duration')) || 0,
      type: record.get('type') || 'exercise',
      distance: record.get('distance') || '',
      rawMessage: record.get('rawMessage') || ''
    }));
    
    return {
      success: true,
      logs
    };
  } catch (error) {
    console.error(`Error getting exercise logs for user ${userId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get food logs for a specific user
 * @param {string} userId - User's phone number
 * @param {number} days - Optional number of days to look back (default: all logs)
 * @returns {Promise<Object>} - User's food logs
 */
async function getUserFoodLogs(userId, days = null) {
  try {
    console.log(`Getting food logs for user ${userId}`);
    
    if (!userId) {
      console.error('No userId provided for getUserFoodLogs');
      return {
        success: false,
        error: 'User ID is required'
      };
    }
    
    const base = getBase();
    const tableName = config.airtable.tables.foodLogs;
    
    // Set up filter formula
    let filterFormula = `{userId} = '${userId}'`;
    
    // Add date filter if specified
    if (days) {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      const thresholdString = formatDateForAirtable(dateThreshold);
      filterFormula = `AND(${filterFormula}, {timestamp} >= '${thresholdString}')`;
    }
    
    // Query Airtable
    const records = await base(tableName)
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: 'timestamp', direction: 'desc' }]
      })
      .all();
    
    console.log(`Found ${records.length} food logs for user ${userId}`);
    
    // Process records
    const logs = records.map(record => ({
      id: record.id,
      timestamp: record.get('timestamp'),
      foodItems: record.get('foodItems') || '',
      rawMessage: record.get('rawMessage') || ''
    }));
    
    return {
      success: true,
      logs
    };
  } catch (error) {
    console.error(`Error getting food logs for user ${userId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Get recent messages for a user (combine exercise and food logs)
 * @param {string} userId - User's phone number
 * @param {number} limit - Maximum number of messages to return
 * @returns {Promise<Array>} - Array of messages
 */
async function getRecentMessages(userId, limit = 20) {
  try {
    console.log(`Getting recent messages for user ${userId}`);
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const base = getBase();
    
    // Get exercise logs
    const exerciseRecords = await base(config.airtable.tables.exerciseLogs)
      .select({
        filterByFormula: `{userId} = '${userId}'`,
        sort: [{ field: 'timestamp', direction: 'desc' }],
        maxRecords: limit
      })
      .all();
    
    console.log(`Found ${exerciseRecords.length} exercise records`);
    
    // Get food logs
    const foodRecords = await base(config.airtable.tables.foodLogs)
      .select({
        filterByFormula: `{userId} = '${userId}'`,
        sort: [{ field: 'timestamp', direction: 'desc' }],
        maxRecords: limit
      })
      .all();
    
    console.log(`Found ${foodRecords.length} food records`);
    
    // Process exercise logs into messages
    const exerciseMessages = exerciseRecords.map(record => ({
      id: record.id,
      content: record.get('rawMessage'),
      timestamp: new Date(record.get('timestamp')),
      type: 'incoming',
      category: 'exercise',
      channel: 'whatsapp',
      processed: true,
      processed_data: {
        exercise: {
          duration: parseInt(record.get('duration')) || null,
          type: record.get('type') || null,
          distance: record.get('distance') || null
        }
      }
    }));
    
    // Process food logs into messages
    const foodMessages = foodRecords.map(record => ({
      id: record.id,
      content: record.get('rawMessage'),
      timestamp: new Date(record.get('timestamp')),
      type: 'incoming',
      category: 'food',
      channel: 'whatsapp',
      processed: true,
      processed_data: {
        food: {
          description: record.get('foodItems') || null
        }
      }
    }));
    
    // Combine and sort messages by timestamp (most recent first)
    const allMessages = [...exerciseMessages, ...foodMessages]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    console.log(`Returning ${allMessages.length} combined messages`);
    
    return allMessages;
  } catch (error) {
    console.error('Error getting recent messages from Airtable:', error);
    throw error;
  }
}

// Add this function to the module exports
module.exports = {
  logExercise,
  logFood,
  getUserStatus,
  ensureUserExists,
  getRecentMessages
};