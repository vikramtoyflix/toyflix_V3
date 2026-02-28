
export const getStoredSession = () => {
  try {
    console.log('📦 Storage: Retrieving stored session...');
    const stored = localStorage.getItem('toyflix_custom_session');
    
    if (!stored) {
      console.log('📦 Storage: No session found in localStorage');
      return null;
    }

    const session = JSON.parse(stored);
    console.log('📦 Storage: Session retrieved successfully');
    console.log('📦 Storage: Session has access_token:', !!session.access_token);
    console.log('📦 Storage: Session user ID:', session.user?.id);
    
    return session;
  } catch (error) {
    console.error('📦 Storage: Error retrieving session:', error);
    return null;
  }
};

export const setStoredSession = (session: any) => {
  try {
    console.log('📦 Storage: Storing session...');
    localStorage.setItem('toyflix_custom_session', JSON.stringify(session));
    console.log('📦 Storage: Session stored successfully');
  } catch (error) {
    console.error('📦 Storage: Error storing session:', error);
  }
};

export const clearStoredSession = () => {
  try {
    console.log('📦 Storage: Clearing stored session...');
    localStorage.removeItem('toyflix_custom_session');
    localStorage.removeItem('toyflix_custom_user');
    console.log('📦 Storage: Session cleared successfully');
  } catch (error) {
    console.error('📦 Storage: Error clearing session:', error);
  }
};

export const getStoredUser = () => {
  try {
    console.log('📦 Storage: Retrieving stored user...');
    const stored = localStorage.getItem('toyflix_custom_user');
    
    if (!stored) {
      console.log('📦 Storage: No user found in localStorage');
      return null;
    }

    const user = JSON.parse(stored);
    console.log('📦 Storage: User retrieved successfully');
    console.log('📦 Storage: User ID:', user.id);
    console.log('📦 Storage: User role:', user.role);
    
    return user;
  } catch (error) {
    console.error('📦 Storage: Error retrieving user:', error);
    return null;
  }
};

export const setStoredUser = (user: any) => {
  try {
    console.log('📦 Storage: Storing user...');
    localStorage.setItem('toyflix_custom_user', JSON.stringify(user));
    console.log('📦 Storage: User stored successfully');
  } catch (error) {
    console.error('📦 Storage: Error storing user:', error);
  }
};

// Composite functions that other files expect
export const saveAuthToStorage = (user: any, session: any) => {
  try {
    console.log('📦 Storage: Saving auth to storage (user + session)...');
    setStoredUser(user);
    setStoredSession(session);
    console.log('📦 Storage: Auth saved successfully');
  } catch (error) {
    console.error('📦 Storage: Error saving auth to storage:', error);
  }
};

export const clearAuthStorage = () => {
  try {
    console.log('📦 Storage: Clearing all auth storage...');
    clearStoredSession();
    console.log('📦 Storage: All auth storage cleared successfully');
  } catch (error) {
    console.error('📦 Storage: Error clearing auth storage:', error);
  }
};
