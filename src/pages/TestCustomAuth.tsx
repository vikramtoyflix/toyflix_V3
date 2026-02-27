
import { CustomAuthProvider } from "@/hooks/useCustomAuth";
import CustomOTPAuth from "@/components/auth/CustomOTPAuth";

const TestCustomAuth = () => {
  return (
    <CustomAuthProvider>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
        <CustomOTPAuth />
      </div>
    </CustomAuthProvider>
  );
};

export default TestCustomAuth;
