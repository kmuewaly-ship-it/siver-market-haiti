import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  MousePointer, 
  ShoppingCart, 
  Smartphone, 
  Monitor,
  FileText,
  MessageCircle,
  Link as LinkIcon,
  ArrowUpRight,
  Loader2,
  Calendar
} from 'lucide-react';
import { useCatalogClickTracking, type ClickStats } from '@/hooks/useCatalogClickTracking';
import { useStoreByOwner } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

export const SellerAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: userStore } = useStoreByOwner(user?.id);
  const { fetchClickStats, isLoading } = useCatalogClickTracking();
  
  const [stats, setStats] = useState<ClickStats | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Fetch stats
  useEffect(() => {
    const loadStats = async () => {
      if (!userStore?.id) return;
      
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const dateFrom = subDays(new Date(), days);
      
      const data = await fetchClickStats(userStore.id, dateFrom, new Date());
      setStats(data);
    };

    loadStats();
  }, [userStore?.id, dateRange, fetchClickStats]);

  // Source distribution for pie chart
  const sourceData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'PDF', value: stats.pdfClicks, color: COLORS[0] },
      { name: 'WhatsApp', value: stats.whatsappClicks, color: COLORS[1] },
      { name: 'Link Directo', value: stats.directClicks, color: COLORS[2] },
    ].filter(d => d.value > 0);
  }, [stats]);

  // Device distribution for pie chart
  const deviceData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Móvil', value: stats.mobileClicks, color: COLORS[3] },
      { name: 'Desktop', value: stats.desktopClicks, color: COLORS[4] },
    ].filter(d => d.value > 0);
  }, [stats]);

  if (!userStore) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Necesitas tener una tienda para ver analytics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Analytics de Marketing</h2>
          <p className="text-muted-foreground">
            Rendimiento de catálogos PDF y estados de WhatsApp
          </p>
        </div>
        
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
          <SelectTrigger className="w-40">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 días</SelectItem>
            <SelectItem value="30d">Últimos 30 días</SelectItem>
            <SelectItem value="90d">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !stats ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MousePointer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay datos disponibles</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MousePointer className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clics Totales</p>
                    <p className="text-2xl font-bold">{stats.totalClicks.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conversión</p>
                    <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Desde PDF</p>
                    <p className="text-2xl font-bold">{stats.pdfClicks.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <MessageCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Desde WhatsApp</p>
                    <p className="text-2xl font-bold">{stats.whatsappClicks.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clicks over time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clics por Día</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.clicksByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={stats.clicksByDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(val) => format(new Date(val), 'd MMM', { locale: es })}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        labelFormatter={(val) => format(new Date(val), 'PPP', { locale: es })}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Sin datos de clics
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Source distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fuente de Clics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  {sourceData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="50%" height={200}>
                        <PieChart>
                          <Pie
                            data={sourceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {sourceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-3">
                        {sourceData.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm">{item.name}</span>
                            <Badge variant="secondary" className="ml-auto">
                              {item.value}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-[200px] flex items-center justify-center text-muted-foreground">
                      Sin datos de fuentes
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Productos por Clics
              </CardTitle>
              <CardDescription>
                Productos que más interés generan desde marketing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.topProducts.length > 0 ? (
                <div className="space-y-4">
                  {stats.topProducts.map((product, idx) => (
                    <div 
                      key={product.product_id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="font-bold text-primary">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.conversions} conversiones
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{product.clicks}</p>
                        <p className="text-xs text-muted-foreground">clics</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={product.conversions > 0 ? 'default' : 'secondary'}>
                          {product.clicks > 0 ? ((product.conversions / product.clicks) * 100).toFixed(1) : 0}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <MousePointer className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Aún no hay clics registrados</p>
                  <p className="text-sm">Comparte tus catálogos para empezar a ver estadísticas</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Smartphone className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Desde Móvil</p>
                      <p className="text-2xl font-bold">{stats.mobileClicks.toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-lg">
                    {stats.totalClicks > 0 ? ((stats.mobileClicks / stats.totalClicks) * 100).toFixed(0) : 0}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Monitor className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Desde Desktop</p>
                      <p className="text-2xl font-bold">{stats.desktopClicks.toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-lg">
                    {stats.totalClicks > 0 ? ((stats.desktopClicks / stats.totalClicks) * 100).toFixed(0) : 0}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default SellerAnalyticsDashboard;
