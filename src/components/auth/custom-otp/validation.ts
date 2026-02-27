
export const validatePhoneNumber = (phoneNumber: string): { isValid: boolean; error: string } => {
  if (!phoneNumber || phoneNumber.length !== 10) {
    return {
      isValid: false,
      error: "Please enter a valid 10-digit phone number"
    };
  }
  return {
    isValid: true,
    error: ""
  };
};
