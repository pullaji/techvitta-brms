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
  DollarSign,
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
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="heading-xl text-4xl mb-2">Dashboard</h1>
              <p className="text-muted-foreground flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Welcome back, here's what's happening with your receipts today.
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button className="btn-gradient mt-4 sm:mt-0">
                <Upload className="w-4 h-4 mr-2" />
                Quick Upload
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
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
                <Card className="card-interactive p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.name}</p>
                      <p className="heading-md text-2xl font-semibold">{stat.value}</p>
                      <p className={`text-xs mt-1 ${
                        stat.change.startsWith('+') ? 'text-success' : 'text-muted-foreground'
                      }`}>
                        {stat.change}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
              
              <div className="h-80">
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
                    >
                      {chartData?.categoryData?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-elevated)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {chartData?.categoryData?.map((category: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-muted-foreground">{category.name}</span>
                    <span className="text-sm font-medium ml-auto">{category.value}%</span>
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

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData?.monthlyData || []}>
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-elevated)',
                    }}
                  />
                  <Bar dataKey="receipts" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="transactions" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}