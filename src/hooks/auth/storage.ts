
export const getStoredSession = () => {
  try {
    const stored = localStorage.getItem('toyflix_custom_session');
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('📦 Storage: Error retrieving session:', error);
    return null;
  }
};

export const setStoredSession = (session: any) => {
  try {
    localStorage.setItem('toyflix_custom_session', JSON.stringify(session));
  } catch (error) {
    console.error('📦 Storage: Error storing session:', error);
  }
};

export const clearStoredSession = () => {
  try {
    localStorage.removeItem('toyflix_custom_session');
    localStorage.removeItem('toyflix_custom_user');
    localStorage.removeItem('last_session_verify');
  } catch (error) {
    console.error('📦 Storage: Error clearing session:', error);
  }
};

export const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('toyflix_custom_user');
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('📦 Storage: Error retrieving user:', error);
    return null;
  }
};

export const setStoredUser = (user: any) => {
  try {
    localStorage.setItem('toyflix_custom_user', JSON.stringify(user));
  } catch (error) {
    console.error('📦 Storage: Error storing user:', error);
  }
};

// Composite functions that other files expect
export const saveAuthToStorage = (user: any, session: any) => {
  // Write both atomically (best-effort; localStorage has no transactions)
  setStoredUser(user);
  setStoredSession(session);
};

export const clearAuthStorage = () => {
  clearStoredSession();
};
