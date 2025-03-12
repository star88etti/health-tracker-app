// Airtable service for data storage
const Airtable = require('airtable');
const config = require('../config');

// Initialize Airtable with Personal Access Token
Airtable.configure({
  apiKey: config.airtable.personalAccessToken,
  endpointUrl: 'https://api.airtable.com'
});

const base = Airtable.base(config.airtable.baseId);

/**
 * Log exercise data to Airtable
 * @param {Object} data - Exercise data
 * @param {string} userId - User's phone number
 * @param {string} rawMessage - Original message
 * @returns {Promise<Object>} - Result of the operation
 */
async function logExercise(data, userId, rawMessage) {
  try {
    const result = await base(config.airtable.tables.exerciseLogs).create([
      {
        fields: {
          timestamp: new Date().toISOString(),
          userId: userId,
          duration: data.duration_minutes || 0,
          type: data.exercise_type || '',
          distance: data.distance || '',
          rawMessage: rawMessage
        }
      }
    ]);
    
    return {
      success: true,
      recordId: result[0].id
    };
  } catch (error) {
    console.error('Error logging exercise to Airtable:', error);
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
    const result = await base(config.airtable.tables.foodLogs).create([
      {
        fields: {
          timestamp: new Date().toISOString(),
          userId: userId,
          foodItems: data.food_items || '',
          rawMessage: rawMessage
        }
      }
    ]);
    
    return {
      success: true,
      recordId: result[0].id
    };
  } catch (error) {
    console.error('Error logging food to Airtable:', error);
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
    // Calculate date threshold (7 days ago)
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const thresholdString = dateThreshold.toISOString();
    
    // Get exercise logs
    const exerciseRecords = await base(config.airtable.tables.exerciseLogs)
      .select({
        filterByFormula: `AND({userId} = '${userId}', {timestamp} > '${thresholdString}')`,
        sort: [{ field: 'timestamp', direction: 'desc' }]
      })
      .all();
    
    // Get food logs
    const foodRecords = await base(config.airtable.tables.foodLogs)
      .select({
        filterByFormula: `AND({userId} = '${userId}', {timestamp} > '${thresholdString}')`,
        sort: [{ field: 'timestamp', direction: 'desc' }]
      })
      .all();
    
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
    // Check if user exists
    const existingUsers = await base(config.airtable.tables.users)
      .select({
        filterByFormula: `{userId} = '${userId}'`
      })
      .all();
    
    if (existingUsers.length === 0) {
      // User doesn't exist, create new user
      const newUser = await base(config.airtable.tables.users).create([
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
    return {
      userId,
      isNew: false,
      exerciseGoal: userRecord.get('exerciseGoal') || 3,
      foodLogGoal: userRecord.get('foodLogGoal') || 1,
      recordId: userRecord.id
    };
  } catch (error) {
    console.error('Error ensuring user exists in Airtable:', error);
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