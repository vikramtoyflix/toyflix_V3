import { useNavigate } from "react-router-dom";
import { useToysWithAgeBands } from "@/hooks/useToysWithAgeBands";
import { Package, ChevronRight } from "lucide-react";

export default function AppHome() {
  const navigate = useNavigate();
  const { data: toys = [], isLoading } = useToysWithAgeBands();
  const featured = toys.filter((t) => t.is_featured).slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="pt-safe px-4 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Toyflix</h1>
        <p className="mt-1 text-slate-400 text-sm">Rent toys. Return. Repeat.</p>
      </header>

      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Featured toys</h2>
          <button
            type="button"
            onClick={() => navigate("/toys")}
            className="text-amber-400 text-sm font-medium flex items-center gap-0.5"
          >
            See all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {featured.map((toy) => (
              <button
                key={toy.id}
                type="button"
                onClick={() => navigate(`/toys/${toy.id}`)}
                className="text-left rounded-xl overflow-hidden bg-slate-800 border border-slate-700/50 active:scale-[0.98] transition-transform"
              >
                <div className="aspect-square bg-slate-700 relative">
                  {toy.image_url ? (
                    <img
                      src={toy.image_url}
                      alt={toy.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-slate-500" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-medium text-white line-clamp-2">{toy.name}</p>
                  <p className="text-xs text-amber-400 mt-0.5">₹{toy.rental_price}/mo</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="px-4 mt-8 pb-8">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="w-full py-3 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium flex items-center justify-between"
        >
          My dashboard <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      </section>
    </div>
  );
}
