import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToysWithAgeBands } from "@/hooks/useToysWithAgeBands";
import { Package, Search } from "lucide-react";

// S3 storage URLs must use public path for browser loading
function toPublicImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  return url.replace("/storage/v1/s3/", "/storage/v1/object/public/");
}

export default function AppToys() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: toys = [], isLoading } = useToysWithAgeBands();

  const filtered = search.trim()
    ? toys.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          (t.category && t.category.toLowerCase().includes(search.toLowerCase()))
      )
    : toys;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="pt-safe px-4 pb-4 sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
        <h1 className="text-xl font-bold text-white">Catalog</h1>
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            placeholder="Search toys..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm"
          />
        </div>
      </header>

      <div className="px-4 pb-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No toys found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((toy) => (
              <button
                key={toy.id}
                type="button"
                onClick={() => navigate(`/toys/${toy.id}`)}
                className="text-left rounded-xl overflow-hidden bg-slate-800 border border-slate-700/50 active:scale-[0.98] transition-transform"
              >
                <div className="aspect-square bg-slate-700 relative">
                  {toy.image_url ? (
                    <img
                      src={toPublicImageUrl(toy.image_url)}
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
      </div>
    </div>
  );
}
