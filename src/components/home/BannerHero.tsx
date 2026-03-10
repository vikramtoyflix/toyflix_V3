import React from "react";

const BannerHero = () => {
  return (
    <section className="relative w-full overflow-hidden">
      <div
        className="relative flex flex-col items-center justify-center min-h-[220px] sm:min-h-[260px] md:min-h-[300px] px-6 py-12 sm:py-16"
        style={{
          background: "linear-gradient(180deg, #e8f4fc 0%, #d4eaf7 50%, #c5e2f4 100%)",
          boxShadow: "inset 0 0 120px 40px rgba(255,255,255,0.4)",
        }}
      >
        {/* Subtle speckles for ethereal feel */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, white 1px, transparent 1px),
                             radial-gradient(circle at 80% 70%, white 1px, transparent 1px),
                             radial-gradient(circle at 40% 60%, white 1px, transparent 1px),
                             radial-gradient(circle at 60% 20%, white 1px, transparent 1px),
                             radial-gradient(circle at 90% 50%, white 1px, transparent 1px)`,
            backgroundSize: "120px 120px, 150px 150px, 100px 100px, 180px 180px, 140px 140px",
          }}
        />
        <div className="relative z-10 text-center">
          <h2 className="font-outfit font-bold text-[#1e3a5f] text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight">
            Play that matches your
          </h2>
          <div className="w-24 sm:w-32 h-px mx-auto my-2 sm:my-3 bg-[#7eb8e0]/70" aria-hidden />
          <h2 className="font-outfit font-bold text-[#1e3a5f] text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight">
            child's growing mind.
          </h2>
        </div>
      </div>
    </section>
  );
};

export default BannerHero;
