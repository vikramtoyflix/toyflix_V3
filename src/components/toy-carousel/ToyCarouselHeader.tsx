import { Sparkles } from "lucide-react";

const ToyCarouselHeader = () => {
  return (
    <div className="text-center mb-10">
      <p className="font-outfit text-sm font-medium text-toy-coral uppercase tracking-wide mb-2 flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5" />
        Featured Toys
      </p>
      <h2 className="font-playfair font-bold text-3xl md:text-4xl mb-3 bg-gradient-to-r from-toy-coral via-terracotta to-toy-sunshine bg-clip-text text-transparent">
        Rent premium toys
      </h2>
      <p className="font-outfit text-warm-gray/70 text-base max-w-xl mx-auto">
        Curated collection—no purchase needed, just endless fun.
      </p>
    </div>
  );
};

export default ToyCarouselHeader;
