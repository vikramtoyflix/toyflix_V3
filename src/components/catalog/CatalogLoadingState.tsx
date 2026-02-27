
import Header from "@/components/Header";

const CatalogLoadingState = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20 container mx-auto px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
      </div>
    </div>
  );
};

export default CatalogLoadingState;
