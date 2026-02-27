import { useState, useEffect, useCallback, ReactNode } from 'react';
import { CustomAuthContext } from './context';
import { CustomUser, CustomSession } from './types';
import { getStoredSession, getStoredUser, clearAuthStorage, saveAuthToStorage } from './storage';
import { signOut as customSignOut } from './authActions';
import { verifySession } from './sessionManagement';

export const CustomAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [session, setSession] = useState<CustomSession | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSignOut = useCallback(async () => {
    await customSignOut();
    setUser(null);
    setSession(null);
    // Toast notification is now handled by contextual signout logic
  }, []);

  const setAuth = useCallback((newUser: CustomUser, newSession: CustomSession) => {
    // Ensure proper timestamp handling
    const sessionWithProperTimestamp = {
      ...newSession,
      expires_at: typeof newSession.expires_at === 'string' 
        ? new Date(newSession.expires_at).getTime() / 1000
        : newSession.expires_at
    };
    
    console.log('🔄 Setting new auth session:', { user: newUser.id, role: newUser.role });
    saveAuthToStorage(newUser, sessionWithProperTimestamp);
    setUser(newUser);
    setSession(sessionWithProperTimestamp);
  }, []);

  // Add refresh function to force re-check of stored session
  const refreshAuth = useCallback(async () => {
    console.log('🔄 Forcing auth refresh...');
    setLoading(true);
    
    const storedUser = getStoredUser();
    const storedSession = getStoredSession();

    if (storedUser && storedSession) {
      console.log('📱 Found stored session, updating context:', { user: storedUser.id, role: storedUser.role });
      setUser(storedUser);
      setSession(storedSession);
    } else {
      console.log('❌ No stored session found');
      setUser(null);
      setSession(null);
    }
    
    setLoading(false);
  }, []);
  
  const updateUser = useCallback((updatedUser: CustomUser) => {
    if (session) {
      const updatedSession = { ...session, user: updatedUser };
      saveAuthToStorage(updatedUser, updatedSession);
      setUser(updatedUser);
      setSession(updatedSession);
    }
  }, [session]);

  useEffect(() => {
    let isSubscribed = true;
    
    const checkUserSession = async () => {
      if (!isSubscribed) return;
      
      setLoading(true);
      const storedUser = getStoredUser();
      const storedSession = getStoredSession();

      if (storedUser && storedSession) {
        // Verify session without causing infinite loops
        const { valid, user: verifiedUser, session: verifiedSession, error } = await verifySession();

        if (!isSubscribed) return;

        if (valid) {
          const finalUser = verifiedUser || storedUser;
          const finalSession = verifiedSession || storedSession;
          setUser(finalUser);
          setSession(finalSession);
        } else {
          clearAuthStorage();
          setUser(null);
          setSession(null);
          if (error && !error.includes('No session to refresh')) {
            console.log("Session validation failed:", error);
          }
        }
      } else {
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    };

    checkUserSession();
    
    return () => {
      isSubscribed = false;
    };
  }, []);
  
  const value = { user, session, loading, signOut: handleSignOut, setAuth, updateUser, refreshAuth };

  return (
    <CustomAuthContext.Provider value={value}>
      {children}
    </CustomAuthContext.Provider>
  );
};
