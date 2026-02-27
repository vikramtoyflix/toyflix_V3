
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSubscriptionPlanStats, formatSubscriptionPlanDisplay } from "./AdminSubscriptionHelper";

const AdminAnalytics = () => {
  // Fetch revenue data
  const { data: revenueData } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_orders')
        .select('amount, created_at')
        .eq('status', 'paid')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by month and sum revenue
      const monthlyRevenue = data?.reduce((acc: any, order) => {
        const month = new Date(order.created_at).toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + Number(order.amount);
        return acc;
      }, {});

      return Object.entries(monthlyRevenue || {}).map(([month, revenue]) => ({
        month,
        revenue: revenue as number
      }));
    },
  });

  // Fetch user growth data
  const { data: userGrowthData } = useQuery({
    queryKey: ['analytics-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_users')
        .select('created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by month and count users
      const monthlyUsers = data?.reduce((acc: any, profile) => {
        const month = new Date(profile.created_at).toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(monthlyUsers || {}).map(([month, users]) => ({
        month,
        users: users as number
      }));
    },
  });

  // Fetch category data
  const { data: categoryData } = useQuery({
    queryKey: ['analytics-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('toys')
        .select('category')
        .order('category');

      if (error) throw error;

      const categories = data?.reduce((acc: any, toy) => {
        acc[toy.category] = (acc[toy.category] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(categories || {}).map(([category, count]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        count: count as number
      }));
    },
  });

  // Fetch subscription data
  const { data: subscriptionData } = useQuery({
    queryKey: ['analytics-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_users')
        .select('subscription_plan')
        .eq('subscription_active', true);

      if (error) throw error;

      // Use the helper to get proper subscription plan stats
      const stats = getSubscriptionPlanStats(data || []);
      
      return stats.map(stat => ({
        plan: stat.displayName,
        count: stat.count,
        percentage: stat.percentage,
        color: stat.color
      }));
    },
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const chartConfig = {
    revenue: { label: "Revenue", color: "#8884d8" },
    users: { label: "Users", color: "#82ca9d" },
    count: { label: "Count", color: "#ffc658" },
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userGrowthData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="users" fill="var(--color-users)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ category, count }) => `${category}: ${count}`}
                  >
                    {categoryData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subscriptionData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="plan" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
