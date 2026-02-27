import { Car, Bike } from "lucide-react";

const RideOnToysCarouselHeader = () => {
  return (
    <div className="text-center mb-10 animate-flicker">
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Car className="h-8 w-8 sm:h-9 sm:w-9 text-toy-coral flex-shrink-0" />
        {/* Use the same solid teal heading color as Featured Toys */}
        <h2 className="font-playfair font-bold text-3xl md:text-4xl text-[#059669]">
          Ride On Toys
        </h2>
        <Bike className="h-8 w-8 sm:h-9 sm:w-9 text-rose-500 flex-shrink-0" />
      </div>
      <p className="font-outfit text-warm-gray/70 text-base max-w-xl mx-auto mt-3">
        Active play and development with our ride-on collection.
      </p>
    </div>
  );
};

export default RideOnToysCarouselHeader;
