import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CreditCard, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Percent,
  Package,
  AlertCircle,
  DollarSign,
  ShoppingCart
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePayments, useSellers } from "@/hooks/usePayments";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "verified":
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-teal/10 text-teal"><CheckCircle2 className="w-3 h-3" />Verificado</span>;
    case "pending":
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500"><Clock className="w-3 h-3" />Pendiente</span>;
    case "rejected":
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive"><AlertTriangle className="w-3 h-3" />Rechazado</span>;
    default:
      return null;
  }
};

const getMethodLabel = (method: string) => {
  switch (method) {
    case "stripe": return "Stripe";
    case "moncash": return "Mon Cash";
    case "transfer": return "Transferencia";
    default: return method;
  }
};

const StatCard = ({ icon: Icon, label, value, color, bgColor, isLoading }: any) => (
  <div className="bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-border/50">
    <div className="flex items-start justify-between mb-3">
      <div className={`${bgColor} p-2 rounded-lg`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    {isLoading ? (
      <Skeleton className="h-6 w-16" />
    ) : (
      <p className="text-lg font-semibold text-foreground">{value}</p>
    )}
  </div>
);

// Hook to get admin dashboard stats
const useAdminDashboardStats = () => {
  return useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      // Fetch all stats in parallel
      const [
        ordersResult,
        commissionsResult,
        kycPendingResult,
        approvalsResult,
        totalRevenueResult
      ] = await Promise.all([
        // Total orders (B2B)
        supabase.from("orders_b2b").select("id, total_amount", { count: "exact" }),
        // Total commissions (unpaid)
        supabase.from("commission_debts").select("commission_amount, is_paid"),
        // KYC pending
        supabase.from("kyc_verifications").select("id", { count: "exact" }).eq("status", "pending_verification"),
        // Pending approvals
        supabase.from("admin_approval_requests").select("id", { count: "exact" }).eq("status", "pending"),
        // Total revenue from paid orders
        supabase.from("orders_b2b").select("total_amount").eq("payment_status", "paid")
      ]);

      // Calculate totals
      const totalOrders = ordersResult.count || 0;
      
      const totalRevenue = totalRevenueResult.data?.reduce(
        (sum, order) => sum + (Number(order.total_amount) || 0), 0
      ) || 0;
      
      const commissions = commissionsResult.data || [];
      const totalCommissions = commissions.reduce(
        (sum, c) => sum + (Number(c.commission_amount) || 0), 0
      );
      const unpaidCommissions = commissions
        .filter(c => !c.is_paid)
        .reduce((sum, c) => sum + (Number(c.commission_amount) || 0), 0);
      
      const kycPending = kycPendingResult.count || 0;
      const pendingApprovals = approvalsResult.count || 0;

      return {
        totalOrders,
        totalRevenue,
        totalCommissions,
        unpaidCommissions,
        kycPending,
        pendingApprovals,
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });
};

const AdminDashboard = () => {
  const { payments, stats, isLoading: paymentsLoading } = usePayments();
  const { sellersCount, isLoading: sellersLoading } = useSellers();
  const { data: dashStats, isLoading: statsLoading } = useAdminDashboardStats();

  const isLoading = paymentsLoading || sellersLoading;
  const recentPayments = payments.slice(0, 5);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const stickyStatsData = [
    {
      label: "Total Órdenes",
      value: dashStats?.totalOrders?.toLocaleString() || "0",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      isLoading: statsLoading
    },
    {
      label: "Ingresos",
      value: formatCurrency(dashStats?.totalRevenue || 0),
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      isLoading: statsLoading
    },
    {
      label: "Comisiones",
      value: formatCurrency(dashStats?.totalCommissions || 0),
      icon: DollarSign,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      isLoading: statsLoading
    },
    {
      label: "Vendedores",
      value: sellersCount.toString(),
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      isLoading: sellersLoading
    },
    {
      label: "KYC Pendiente",
      value: dashStats?.kycPending?.toString() || "0",
      icon: AlertCircle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      isLoading: statsLoading
    },
    {
      label: "Aprobaciones",
      value: dashStats?.pendingApprovals?.toString() || "0",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      isLoading: statsLoading
    }
  ];

  const dashStatsData = [
    {
      title: "Pagos Pendientes",
      value: stats.pending.toString(),
      description: "Requieren verificación",
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      link: "/admin/conciliacion?status=pending"
    },
    {
      title: "Pagos Verificados",
      value: stats.verified.toString(),
      description: "Este mes",
      icon: CheckCircle2,
      color: "text-teal",
      bgColor: "bg-teal/10",
      link: "/admin/conciliacion?status=verified"
    },
    {
      title: "Vendedores Activos",
      value: sellersCount.toString(),
      description: "Registrados",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
      link: "/admin/vendedores"
    },
    {
      title: "Volumen B2B",
      value: formatCurrency(stats.totalVolume || 0),
      description: "Total verificado",
      icon: TrendingUp,
      color: "text-accent",
      bgColor: "bg-accent/10",
      link: "/admin/conciliacion"
    },
    {
      title: "Comisiones Pendientes",
      value: formatCurrency(dashStats?.unpaidCommissions || 0),
      description: "Por cobrar",
      icon: Percent,
      color: "text-purple-600",
      bgColor: "bg-purple-600/10",
      link: "/admin/commissions"
    },
  ];

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard" subtitle="Bienvenido al panel de administración">
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 -mx-6 px-6 py-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Dashboard" 
      subtitle="Bienvenido al panel de administración"
    >
      {/* Sticky Stats Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 -mx-6 px-6 py-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stickyStatsData.map((stat) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              color={stat.color}
              bgColor={stat.bgColor}
              isLoading={stat.isLoading}
            />
          ))}
        </div>
      </div>

      {/* Dashboard Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {dashStatsData.map((stat) => (
          <Link key={stat.title} to={stat.link}>
            <Card className="hover:shadow-card transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Pagos Recientes B2B</CardTitle>
            <p className="text-sm text-muted-foreground">Últimas transacciones para verificar</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/admin/conciliacion">Ver Todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {recentPayments.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Vendedor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Monto</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Método</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-sm font-mono text-foreground">{payment.payment_number}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{payment.seller?.name || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-foreground">${payment.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{getMethodLabel(payment.method)}</td>
                      <td className="py-3 px-4">{getStatusBadge(payment.status)}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString("es-HT", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">Sin pagos recientes</p>
                <p className="text-sm text-muted-foreground">Los pagos B2B aparecerán aquí cuando se registren</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard;