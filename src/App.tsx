import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@/components/Layout/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Audit from "./pages/Audit";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />
          
          {/* Protected Routes with Navigation */}
          <Route path="/dashboard" element={
            <div>
              <Navbar />
              <Dashboard />
            </div>
          } />
          <Route path="/upload" element={
            <div>
              <Navbar />
              <Upload />
            </div>
          } />
          <Route path="/transactions" element={
            <div>
              <Navbar />
              <Transactions />
            </div>
          } />
          <Route path="/reports" element={
            <div>
              <Navbar />
              <Reports />
            </div>
          } />
          <Route path="/settings" element={
            <div>
              <Navbar />
              <Settings />
            </div>
          } />
          <Route path="/audit" element={
            <div>
              <Navbar />
              <Audit />
            </div>
          } />
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
