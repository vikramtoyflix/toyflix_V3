import React from "react";

interface HeaderLogoProps {
  onLogoClick: () => void;
}

const HeaderLogo = ({ onLogoClick }: HeaderLogoProps) => {
  return (
    <div 
      className="cursor-pointer flex items-center gentle-hover" 
      onClick={onLogoClick}
    >
      <img
        src="/toyflix-logo.png"
        alt="Toyflix - Premium Toy Rental Service"
        className="h-8 md:h-10 w-auto"
        loading="eager"
      />
    </div>
  );
};

export default HeaderLogo;
