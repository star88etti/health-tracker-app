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
    
    // Create record object with safe defaults
    const fields = {
      timestamp: new Date(), // Send as JavaScript Date object instead of ISO string
      userId: userId,
      duration: data.duration_minutes || 0,
      type: data.exercise_type || 'exercise',
      distance: data.distance || '',
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
      timestamp: new Date(), // Send as JavaScript Date object instead of ISO string
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
    
    // Calculate date threshold (7 days ago)
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const thresholdString = dateThreshold.toISOString();
    
    const base = getBase();
    
    // Get exercise logs
    console.log(`Querying ${config.airtable.tables.exerciseLogs} table for user ${userId}`);
    const exerciseRecords = await base(config.airtable.tables.exerciseLogs)
      .select({
        filterByFormula: `AND({userId} = '${userId}', IS_AFTER({timestamp}, '${thresholdString}'))`,
        sort: [{ field: 'timestamp', direction: 'desc' }]
      })
      .all();
    
    console.log(`Found ${exerciseRecords.length} exercise records`);
    
    // Get food logs
    console.log(`Querying ${config.airtable.tables.foodLogs} table for user ${userId}`);
    const foodRecords = await base(config.airtable.tables.foodLogs)
      .select({
        filterByFormula: `AND({userId} = '${userId}', IS_AFTER({timestamp}, '${thresholdString}'))`,
        sort: [{ field: 'timestamp', direction: 'desc' }]
      })
      .all();
    
    console.log(`Found ${foodRecords.length} food records`);
    
    // Process exercise logs
    const exerciseLogs = exerciseRecords.map(record => ({
      date: new Date(record.get('timestamp')),
      duration: record.get('duration') || 0,
      type: record.get('type') || 'Unknown',
      distance: record.get('distance') || ''
    }));
    
    // Process food logs
    const foodLogs = foodRecords.map(record => ({
      date: new Date(record.get('timestamp')),
      foodItems: record.get('foodItems') || 'Unknown'
    }));
    
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

module.exports = {
  logExercise,
  logFood,
  getUserStatus,
  ensureUserExists
};