import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Receipt,
  CreditCard,
  Upload,
  TrendingUp,
  Calendar,
  Activity
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { dashboardAPI } from "@/services/supabaseApi";

export default function Dashboard() {
  // Fetch dashboard data from Supabase
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardAPI.getStats,
  });

  const { data: chartData, isLoading: chartLoading, error: chartError } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: dashboardAPI.getChartData,
  });

  const { data: recentActivity, isLoading: activityLoading, error: activityError } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: dashboardAPI.getRecentActivity,
  });

  // Show loading state
  if (statsLoading || chartLoading || activityLoading) {
    return (
      <div className="min-h-screen bg-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (statsError || chartError || activityError) {
    return (
      <div className="min-h-screen bg-gradient flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error loading dashboard data</p>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="heading-xl text-2xl sm:text-3xl lg:text-4xl mb-2">Dashboard</h1>
              <p className="text-muted-foreground text-sm sm:text-base flex items-center">
                <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Welcome back, here's what's happening with your receipts today.</span>
                <span className="sm:hidden">Your financial overview</span>
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button className="btn-gradient w-full sm:w-auto">
                <Upload className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Quick Upload</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8"
        >
          {stats?.map((stat: any, index: number) => {
            const Icon = stat.icon === 'FileText' ? FileText : 
                       stat.icon === 'Receipt' ? Receipt :
                       stat.icon === 'CreditCard' ? CreditCard : Upload;
            
            return (
              <motion.div
                key={stat.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
                whileHover={{ y: -2 }}
              >
                <Card className="card-interactive p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">{stat.name}</p>
                      <p className="heading-md text-lg sm:text-2xl font-semibold">{stat.value}</p>
                      <p className={`text-xs mt-1 ${
                        stat.change.startsWith('+') ? 'text-success' : 'text-muted-foreground'
                      }`}>
                        {stat.change}
                      </p>
                    </div>
                    <div className={`p-2 sm:p-3 rounded-xl ${stat.bgColor} flex-shrink-0 ml-2`}>
                      <Icon className={`w-4 h-4 sm:w-6 sm:h-6 ${stat.color}`} />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Category Breakdown Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="card-elevated p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="heading-md text-xl">Receipt Categories</h3>
                  <p className="text-muted-foreground text-sm">Breakdown by category type</p>
                </div>
                <Button variant="outline" size="sm">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View All
                </Button>
              </div>
              
              <div className="h-64 sm:h-80">
                {chartData?.categoryData && chartData.categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                      data={chartData?.categoryData || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="hsl(var(--card))"
                      strokeWidth={3}
                    >
                      {chartData?.categoryData?.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="hsl(var(--card))"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '2px solid hsl(var(--primary))',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-elevated)',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                      labelStyle={{
                        color: 'hsl(var(--foreground))',
                        fontWeight: '600',
                        marginBottom: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        `${value}%`,
                        name
                      ]}
                    />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <Receipt className="w-8 h-8 text-primary" />
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">No Categories Found</h4>
                      <p className="text-muted-foreground text-sm">Upload receipts to see category breakdown</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
                {chartData?.categoryData?.map((category: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/30">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm font-medium text-foreground truncate">{category.name}</span>
                    <span className="text-sm font-semibold text-primary ml-auto">{category.value}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="card-elevated p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="heading-md text-xl">Recent Activity</h3>
                <Button variant="ghost" size="sm">
                  <Activity className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                {recentActivity?.map((activity: any, index: number) => {
                  const Icon = activity.icon === 'Upload' ? Upload : 
                             activity.icon === 'Receipt' ? Receipt : FileText;
                  
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-start space-x-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="p-2 bg-primary-light rounded-lg">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <Button variant="ghost" className="w-full mt-4 text-primary">
                View All Activity
              </Button>
            </Card>
          </motion.div>
        </div>

        {/* Monthly Overview Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8"
        >
          <Card className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="heading-md text-xl">Monthly Overview</h3>
                <p className="text-muted-foreground text-sm">Receipts and transactions over time</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">6M</Button>
                <Button variant="outline" size="sm">1Y</Button>
                <Button size="sm" className="bg-primary text-primary-foreground">All</Button>
              </div>
            </div>

            <div className="h-64 sm:h-80">
              {chartData?.monthlyData && chartData.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={chartData.monthlyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                  <XAxis 
                    dataKey="month" 
                    axisLine={true}
                    tickLine={true}
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 500 }}
                    axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                    tickLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                  />
                  <YAxis 
                    axisLine={true}
                    tickLine={true}
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 14, fontWeight: 500 }}
                    axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                    tickLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                    tickFormatter={(value) => value.toString()}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '2px solid hsl(var(--primary))',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-elevated)',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                    labelStyle={{
                      color: 'hsl(var(--foreground))',
                      fontWeight: '600',
                      marginBottom: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} ${name}`,
                      name === 'receipts' ? 'Receipts' : 'Transactions'
                    ]}
                  />
                  <Bar 
                    dataKey="receipts" 
                    fill="hsl(215, 84%, 47%)" 
                    radius={[6, 6, 0, 0]}
                    stroke="hsl(215, 84%, 35%)"
                    strokeWidth={2}
                    name="receipts"
                  />
                  <Bar 
                    dataKey="transactions" 
                    fill="hsl(142, 76%, 36%)" 
                    radius={[6, 6, 0, 0]}
                    stroke="hsl(142, 76%, 25%)"
                    strokeWidth={2}
                    name="transactions"
                  />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-8 h-8 text-primary" />
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">No Data Available</h4>
                    <p className="text-muted-foreground text-sm">Upload some transactions to see monthly trends</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Bar Chart Legend */}
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6 mt-6">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'hsl(215, 84%, 47%)' }}></div>
                <span className="text-sm font-medium text-foreground">Receipts</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }}></div>
                <span className="text-sm font-medium text-foreground">Transactions</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}