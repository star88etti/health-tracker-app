// Google Sheets service for data storage
const { google } = require('googleapis');
const config = require('../config');

// Create JWT client for authentication
const getAuth = () => {
  try {
    const auth = new google.auth.JWT(
      config.sheets.credentials.client_email,
      null,
      config.sheets.credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    return auth;
  } catch (error) {
    console.error('Error creating Google auth client:', error);
    throw error;
  }
};

// Initialize Google Sheets API
const getSheets = async () => {
  try {
    const auth = getAuth();
    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Error initializing Google Sheets:', error);
    throw error;
  }
};

/**
 * Log exercise data to Google Sheets
 * @param {Object} data - Exercise data
 * @param {string} userId - User's phone number
 * @param {string} rawMessage - Original message
 * @returns {Promise<Object>} - Result of the operation
 */
async function logExercise(data, userId, rawMessage) {
  try {
    const sheets = await getSheets();
    
    // Format data for sheets
    const values = [
      [
        new Date().toISOString(), // timestamp
        userId, // userId (phone number)
        data.duration_minutes || '', // duration
        data.exercise_type || '', // type
        data.distance || '', // distance
        rawMessage // raw message
      ]
    ];
    
    // Append data to exercise logs sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: config.sheets.spreadsheetId,
      range: `${config.sheets.sheets.exerciseLogs}!A:F`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values }
    });
    
    return {
      success: true,
      updatedRange: response.data.updates.updatedRange
    };
  } catch (error) {
    console.error('Error logging exercise to Google Sheets:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Log food data to Google Sheets
 * @param {Object} data - Food data
 * @param {string} userId - User's phone number
 * @param {string} rawMessage - Original message
 * @returns {Promise<Object>} - Result of the operation
 */
async function logFood(data, userId, rawMessage) {
  try {
    const sheets = await getSheets();
    
    // Format data for sheets
    const values = [
      [
        new Date().toISOString(), // timestamp
        userId, // userId (phone number)
        data.food_items || '', // food items
        rawMessage // raw message
      ]
    ];
    
    // Append data to food logs sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: config.sheets.spreadsheetId,
      range: `${config.sheets.sheets.foodLogs}!A:D`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values }
    });
    
    return {
      success: true,
      updatedRange: response.data.updates.updatedRange
    };
  } catch (error) {
    console.error('Error logging food to Google Sheets:', error);
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
    const sheets = await getSheets();
    
    // Calculate date threshold (7 days ago)
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    
    // Get exercise logs
    const exerciseResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: config.sheets.spreadsheetId,
      range: `${config.sheets.sheets.exerciseLogs}!A:F`
    });
    
    // Get food logs
    const foodResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: config.sheets.spreadsheetId,
      range: `${config.sheets.sheets.foodLogs}!A:D`
    });
    
    // Process exercise logs (filter by user and date)
    const exerciseLogs = exerciseResponse.data.values || [];
    const userExerciseLogs = exerciseLogs
      .filter((row, index) => {
        if (index === 0) return false; // Skip header row
        const rowDate = new Date(row[0]);
        const rowUserId = row[1];
        return rowUserId === userId && rowDate >= dateThreshold;
      })
      .map(row => ({
        date: new Date(row[0]),
        duration: row[2] ? parseInt(row[2]) : 0,
        type: row[3] || 'Unknown',
        distance: row[4] || ''
      }));
    
    // Process food logs (filter by user and date)
    const foodLogs = foodResponse.data.values || [];
    const userFoodLogs = foodLogs
      .filter((row, index) => {
        if (index === 0) return false; // Skip header row
        const rowDate = new Date(row[0]);
        const rowUserId = row[1];
        return rowUserId === userId && rowDate >= dateThreshold;
      })
      .map(row => ({
        date: new Date(row[0]),
        foodItems: row[2] || 'Unknown'
      }));
    
    // Calculate summary statistics
    const totalExerciseSessions = userExerciseLogs.length;
    
    // Calculate average duration (if available)
    let averageDuration = 0;
    const sessionsWithDuration = userExerciseLogs.filter(log => log.duration > 0);
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
        foodLogCount: userFoodLogs.length
      },
      exerciseLogs: userExerciseLogs,
      foodLogs: userFoodLogs
    };
  } catch (error) {
    console.error('Error getting user status from Google Sheets:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Ensure user exists in the users sheet
 * @param {string} userId - User's phone number
 * @returns {Promise<Object>} - User info
 */
async function ensureUserExists(userId) {
  try {
    const sheets = await getSheets();
    
    // Check if user exists
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.sheets.spreadsheetId,
      range: `${config.sheets.sheets.users}!A:E`
    });
    
    const rows = response.data.values || [];
    const userRow = rows.find(row => row[0] === userId);
    
    if (!userRow) {
      // User doesn't exist, create new user
      const newUser = [
        userId, // userId (phone number)
        '', // name
        'No', // onboardingComplete
        '3', // default exerciseGoal (3 times per week)
        '1' // default foodLogGoal (once per day)
      ];
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: config.sheets.spreadsheetId,
        range: `${config.sheets.sheets.users}!A:E`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [newUser] }
      });
      
      return {
        userId,
        isNew: true,
        exerciseGoal: 3,
        foodLogGoal: 1
      };
    }
    
    // Return existing user info
    return {
      userId,
      isNew: false,
      exerciseGoal: parseInt(userRow[3]) || 3,
      foodLogGoal: parseInt(userRow[4]) || 1
    };
  } catch (error) {
    console.error('Error ensuring user exists in Google Sheets:', error);
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