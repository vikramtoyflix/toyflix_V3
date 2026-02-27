declare module '@/components/ui/button' {
  export const Button: React.FC<{
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    className?: string;
    disabled?: boolean;
    onClick?: () => void;
    children: React.ReactNode;
  }>;
}

declare module '@/components/ui/label' {
  export const Label: React.FC<{
    htmlFor?: string;
    className?: string;
    children: React.ReactNode;
  }>;
}

declare module '@/components/ui/input-otp' {
  export const InputOTP: React.FC<{
    value: string;
    onChange: (value: string) => void;
    maxLength: number;
    disabled?: boolean;
    children: React.ReactNode;
  }>;

  export const InputOTPGroup: React.FC<{
    children: React.ReactNode;
  }>;

  export const InputOTPSlot: React.FC<{
    index: number;
  }>;
} 