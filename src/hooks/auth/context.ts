
import { createContext, useContext } from 'react';
import { CustomAuthContextType } from './types';

const CustomAuthContext = createContext<CustomAuthContextType | undefined>(undefined);

export const useCustomAuthContext = () => {
  const context = useContext(CustomAuthContext);
  if (context === undefined) {
    throw new Error('useCustomAuth must be used within a CustomAuthProvider');
  }
  return context;
};

export { CustomAuthContext };
