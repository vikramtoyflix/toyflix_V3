
import { useContext } from 'react';
import { CustomAuthContext } from './auth/context';

export { CustomAuthProvider } from './auth/CustomAuthProvider';
export type { CustomUser, CustomAuthContextType } from './auth/types';

export const useCustomAuth = () => {
  const context = useContext(CustomAuthContext);
  if (context === undefined) {
    throw new Error('useCustomAuth must be used within a CustomAuthProvider');
  }
  return context;
};
