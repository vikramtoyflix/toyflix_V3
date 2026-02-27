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
      <picture>
        <source srcSet="/toyflix-logo.webp" type="image/webp" />
        <img
          src="/toyflix-logo.png"
          alt="Toyflix - Premium Toy Rental Service"
          className="h-8 md:h-10 w-auto"
          loading="eager"
          width="936"
          height="216"
        />
      </picture>
    </div>
  );
};

export default HeaderLogo;
