
import { useNavigate } from "react-router-dom";

export const useNavigationActions = () => {
  const navigate = useNavigate();

  const handleBackToMain = () => {
    navigate("/");
  };

  return {
    handleBackToMain
  };
};
