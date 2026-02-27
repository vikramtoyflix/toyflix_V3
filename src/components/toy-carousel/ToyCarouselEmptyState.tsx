
const ToyCarouselEmptyState = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Toys</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No toys available at the moment. Check back soon for new additions!
          </p>
        </div>
      </div>
    </section>
  );
};

export default ToyCarouselEmptyState;
