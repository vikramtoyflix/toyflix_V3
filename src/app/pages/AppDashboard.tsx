import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { Package, Calendar, Truck } from "lucide-react";

export default function AppDashboard() {
  const { user } = useCustomAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["app-dashboard-orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("rental_orders")
        .select("id, order_number, status, rental_start_date, rental_end_date, cycle_number")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const active = orders.filter((o) => ["confirmed", "shipped", "out_for_delivery"].includes(o.status));
  const past = orders.filter((o) => ["delivered", "returned", "cancelled"].includes(o.status));

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="pt-safe px-4 pb-4">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {user?.first_name ? `Hi, ${user.first_name}` : "Your rentals"}
        </p>
      </header>

      {isLoading ? (
        <div className="px-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Active
              </h2>
              <ul className="space-y-2">
                {active.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-800 border border-slate-700/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{order.order_number}</p>
                      <p className="text-xs text-slate-400">
                        Cycle {order.cycle_number} · {order.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Past orders
              </h2>
              <ul className="space-y-2">
                {past.slice(0, 5).map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/30"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                      <Package className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-300 truncate">{order.order_number}</p>
                      <p className="text-xs text-slate-500">{order.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {orders.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No orders yet.</p>
              <p className="text-sm mt-1">Subscribe on the website to start renting toys.</p>
            </div>
          )}
        </div>
      )}

      <p className="px-4 mt-6 text-slate-500 text-xs">
        For full subscription management, selection windows, and payments, use the website. This app
        stays up even when the site is down.
      </p>
    </div>
  );
}
