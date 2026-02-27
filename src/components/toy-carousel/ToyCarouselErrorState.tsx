
import ToyCarouselHeader from "./ToyCarouselHeader";

const ToyCarouselErrorState = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Toys</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sorry, we're having trouble loading our toys right now. Please try again later.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ToyCarouselErrorState;
