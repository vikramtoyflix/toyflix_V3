import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, ArrowLeft } from "lucide-react";

export default function AppToyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: toy, isLoading } = useQuery({
    queryKey: ["toy", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("toys").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading || !toy) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-8">
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur flex items-center gap-2 pt-safe px-4 py-3 border-b border-slate-800">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold truncate flex-1">{toy.name}</h1>
      </header>

      <div className="px-4 pt-4">
        <div className="aspect-square max-w-sm mx-auto rounded-xl overflow-hidden bg-slate-800">
          {toy.image_url ? (
            <img src={toy.image_url} alt={toy.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-20 h-20 text-slate-500" />
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-amber-400">₹{toy.rental_price}/month</p>
          {toy.retail_price && (
            <p className="text-sm text-slate-400 line-through">₹{toy.retail_price} retail</p>
          )}
        </div>
        {toy.description && (
          <p className="mt-4 text-slate-300 text-sm leading-relaxed">{toy.description}</p>
        )}
        <p className="mt-6 text-slate-500 text-xs">
          Full subscription and checkout are on the website. This app shows catalog and your
          dashboard.
        </p>
      </div>
    </div>
  );
}
