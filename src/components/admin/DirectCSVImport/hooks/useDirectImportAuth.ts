
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useUserRole } from "@/hooks/useUserRole";

export const useDirectImportAuth = () => {
  const { user } = useCustomAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  const isAdmin = userRole === 'admin';
  const canImport = user && isAdmin && !roleLoading;

  return {
    user,
    userRole,
    roleLoading,
    isAdmin,
    canImport
  };
};
