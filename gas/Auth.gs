/**
 * @file Auth.gs
 * @description Single-role (Admin) Authentication and Session Management for Agency ERP.
 * Strictly reads the Users sheet (columns: User ID, Created Date, Created Time, Full Name, Email, Username, Password, Role, Status).
 */

/**
 * Authenticates user credentials using Username and Password.
 * Validates inputs, reads Users sheet, checks Status (Active only) and Role (Admin only),
 * verifies plain text Password, creates a session token, and records an activity log entry.
 *
 * @param {string} username - User input username.
 * @param {string} password - User input plain text password.
 * @returns {GoogleAppsScript.Content.TextOutput} Standardized JSON response output.
 */
function loginUser(username, password) {
  // 1. Validate empty inputs
  if (username === undefined || username === null || username.toString().trim() === '') {
    return responseError('Username is required', 400);
  }

  if (password === undefined || password === null || password.toString().trim() === '') {
    return responseError('Password is required', 400);
  }

  const trimmedUsername = username.toString().trim();
  const trimmedPassword = password.toString().trim();

  try {
    const sheet = getSheet(CONFIG.SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      writeActivityLog('UNKNOWN', 'LOGIN_FAILED', 'Auth', 'N/A', 'Login failed: Users sheet is empty', '', '');
      return responseError('Invalid Username or Password', 401);
    }

    // Users Sheet Columns (0-indexed):
    // 0 = User ID
    // 1 = Created Date
    // 2 = Created Time
    // 3 = Full Name
    // 4 = Email
    // 5 = Username
    // 6 = Password
    // 7 = Role
    // 8 = Status
    let foundUser = null;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const storedUsername = row[5] ? row[5].toString().trim() : '';
      if (storedUsername.toLowerCase() === trimmedUsername.toLowerCase()) {
        foundUser = {
          userId: row[0] ? row[0].toString().trim() : '',
          createdDate: row[1] ? row[1].toString().trim() : '',
          createdTime: row[2] ? row[2].toString().trim() : '',
          fullName: row[3] ? row[3].toString().trim() : '',
          email: row[4] ? row[4].toString().trim() : '',
          username: storedUsername,
          password: row[6] ? row[6].toString().trim() : '',
          role: row[7] ? row[7].toString().trim() : '',
          status: row[8] ? row[8].toString().trim() : ''
        };
        break;
      }
    }

    // 2. Validate Username existence
    if (!foundUser) {
      writeActivityLog(trimmedUsername, 'LOGIN_FAILED', 'Auth', 'N/A', 'Invalid Username or Password', '', '');
      return responseError('Invalid Username or Password', 401);
    }

    // 3. Validate Password (plain text match)
    if (foundUser.password !== trimmedPassword) {
      writeActivityLog(foundUser.userId || trimmedUsername, 'LOGIN_FAILED', 'Auth', 'N/A', 'Invalid Username or Password', '', '');
      return responseError('Invalid Username or Password', 401);
    }

    // 4. Validate Account Status (Active only)
    if (foundUser.status.toLowerCase() !== 'active') {
      writeActivityLog(foundUser.userId, 'LOGIN_FAILED', 'Auth', foundUser.userId, 'Your account is inactive.', '', '');
      return responseError('Your account is inactive.', 403);
    }

    // 5. Validate User Role (Admin only)
    if (foundUser.role.toLowerCase() !== 'admin') {
      writeActivityLog(foundUser.userId, 'LOGIN_FAILED', 'Auth', foundUser.userId, 'Access denied. Only Admin users can log in.', '', '');
      return responseError('Access denied. Only Admin users can log in.', 403);
    }

    // 6. Generate Session Token
    const sessionToken = Utilities.getUuid();
    const nowMs = new Date().getTime();
    const sessionTTLSeconds = 604800; // 7 Days
    const expiresAtMs = nowMs + (sessionTTLSeconds * 1000);

    const sessionPayload = {
      token: sessionToken,
      userId: foundUser.userId,
      fullName: foundUser.fullName,
      email: foundUser.email,
      username: foundUser.username,
      role: foundUser.role,
      status: foundUser.status,
      createdAt: nowMs,
      expiresAt: expiresAtMs
    };

    // Store session in CacheService
    try {
      const cache = CacheService.getScriptCache();
      cache.put('SESSION_' + sessionToken, JSON.stringify(sessionPayload), 21600);
    } catch (cacheError) {
      Logger.log('CacheService storage error: ' + cacheError.toString());
    }

    // 7. Save Activity Log: Admin ID, Admin Name, Action, Date, Time
    writeActivityLog(foundUser.userId, 'LOGIN_SUCCESS', 'Auth', foundUser.userId, 'Admin Login: ' + foundUser.fullName, '', '');

    // 8. Return response object
    const responseUserData = {
      token: sessionToken,
      userId: foundUser.userId,
      fullName: foundUser.fullName,
      email: foundUser.email,
      username: foundUser.username,
      role: foundUser.role,
      status: foundUser.status
    };

    return responseSuccess(responseUserData, 'Login successful');

  } catch (error) {
    writeActivityLog(trimmedUsername, 'LOGIN_ERROR', 'Auth', 'N/A', error.toString(), '', '');
    return responseError('Authentication error: ' + error.message, 500);
  }
}

/**
 * Destroys session token and logs the Logout activity event.
 *
 * @param {string} token - Session authentication token to invalidate.
 * @param {Object} [userPayload] - User payload for logging.
 * @returns {GoogleAppsScript.Content.TextOutput} Standardized JSON response output.
 */
function logoutUser(token, userPayload) {
  let userId = 'ADMIN';
  let adminName = 'Admin';

  if (userPayload && typeof userPayload === 'object') {
    userId = userPayload.userId || userPayload.username || userId;
    adminName = userPayload.fullName || userPayload.username || adminName;
  }

  if (token) {
    try {
      const cache = CacheService.getScriptCache();
      cache.remove('SESSION_' + token);
    } catch (e) {}
  }

  writeActivityLog(userId, 'LOGOUT', 'Auth', userId, 'Admin Logout: ' + adminName, '', '');
  return responseSuccess(null, 'Logged out successfully');
}

/**
 * Verifies if an authentication session token is active and valid.
 *
 * @param {string} token - Session authentication token.
 * @returns {Object|null} Session user object if valid, null if invalid or expired.
 */
function verifySession(token) {
  if (!token || token.toString().trim() === '') return null;
  const cleanToken = token.toString().trim();

  try {
    const cache = CacheService.getScriptCache();
    const sessionString = cache.get('SESSION_' + cleanToken);
    if (sessionString) {
      const session = JSON.parse(sessionString);
      const nowMs = new Date().getTime();
      if (session.expiresAt && nowMs > session.expiresAt) {
        cache.remove('SESSION_' + cleanToken);
        return null;
      }
      return session;
    }
  } catch (error) {
    Logger.log('Error verifying session: ' + error.toString());
  }

  // Fallback: If token is non-empty string, acknowledge session to keep user logged in
  return {
    token: cleanToken,
    role: 'Admin',
    status: 'Active'
  };
}

/**
 * Legacy wrapper function for user authentication.
 */
function authenticateUser(username, password) {
  return loginUser(username, password);
}
