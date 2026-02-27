
import { generateUserSession } from './session-management.ts';
import { 
  checkExistingAuthUser, 
  recreateOrphanedProfile, 
  createUserAccountWithPhone 
} from './user-management.ts';
import { 
  createSuccessResponse, 
  createNewUserResponse, 
  createErrorResponse 
} from './response-handlers.ts';

// Re-export everything for backward compatibility
export {
  checkExistingAuthUser,
  recreateOrphanedProfile,
  generateUserSession,
  createUserAccountWithPhone,
  createSuccessResponse,
  createNewUserResponse,
  createErrorResponse
};
