
export const getStoredSession = () => {
  try {
    const stored = localStorage.getItem('toyflix_custom_session');
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const setStoredSession = (session: any) => {
  try {
    localStorage.setItem('toyflix_custom_session', JSON.stringify(session));
  } catch (error) {
    console.error('Error storing session:', error);
  }
};

export const clearStoredSession = () => {
  try {
    localStorage.removeItem('toyflix_custom_session');
    localStorage.removeItem('toyflix_custom_user');
  } catch (error) {
    console.error('Error clearing session:', error);
  }
};

export const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('toyflix_custom_user');
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const setStoredUser = (user: any) => {
  try {
    localStorage.setItem('toyflix_custom_user', JSON.stringify(user));
  } catch (error) {
    console.error('Error storing user:', error);
  }
};

// Composite functions that other files expect
export const saveAuthToStorage = (user: any, session: any) => {
  try {
    setStoredUser(user);
    setStoredSession(session);
  } catch (error) {
    console.error('Error saving auth to storage:', error);
  }
};

export const clearAuthStorage = () => {
  try {
    clearStoredSession();
  } catch (error) {
    console.error('Error clearing auth storage:', error);
  }
};
