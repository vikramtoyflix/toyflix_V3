
import Header from "@/components/Header";

const CatalogErrorState = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20 container mx-auto px-4 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Error loading toys</h1>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    </div>
  );
};

export default CatalogErrorState;
