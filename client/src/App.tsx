import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { SocketProvider } from "@/contexts/SocketContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { RoleDashboardLayout } from "@/components/RoleDashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import MobileBottomNav from "@/components/MobileBottomNav";
import { SplashScreen } from "@/components/SplashScreen";
import { useState, useEffect } from "react";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import AdminSetup from "@/pages/AdminSetup";
import WorkshopDashboard from "@/pages/WorkshopDashboard";
import SupplierStorePage from "@/pages/SupplierStorePage";
import MarketplaceLanding from "@/pages/workshop/MarketplaceLanding";
import SupplierGrid from "@/pages/workshop/SupplierGrid";
import SupplierStore from "@/pages/workshop/SupplierStore";
import WorkshopCart from "@/pages/WorkshopCart";
import WorkshopOrders from "@/pages/WorkshopOrders";
import WorkshopInventory from "@/pages/WorkshopInventory";
import StaffAttendance from "@/pages/StaffAttendance";
import StaffDashboard from "@/pages/StaffDashboard";
import StaffProfile from "@/pages/StaffProfile";
import WorkshopSettings from "@/pages/WorkshopSettings";
import JobDetail from "@/pages/JobDetail";
import CustomerJobView from "@/pages/CustomerJobView";
import SupplierDashboard from "@/pages/SupplierDashboard";
import SupplierProducts from "@/pages/SupplierProducts";
import SupplierOrders from "@/pages/SupplierOrders";
import CustomerJobs from "@/pages/CustomerJobs";
import CustomerBookings from "@/pages/CustomerBookings";
import CustomerHistory from "@/pages/CustomerHistory";
import CustomerWallet from "@/pages/CustomerWallet";
import WorkshopDetails from "@/pages/WorkshopDetails";
import RunnerDashboard from "@/pages/RunnerDashboard";
import RunnerJobs from "@/pages/RunnerJobs";
import RunnerLiveMap from "@/pages/RunnerLiveMap";
import RunnerWallet from "@/pages/RunnerWallet";
import RunnerSettings from "@/pages/RunnerSettings";
import CustomerDashboard from "@/pages/CustomerDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import Orders from "@/pages/Orders";
import Parts from "@/pages/Parts";
import Jobs from "@/pages/Jobs";
import Deliveries from "@/pages/Deliveries";
import BookService from "@/pages/BookService";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import ChatPage from "@/pages/ChatPage";
import WorkshopProfile from "@/pages/WorkshopProfile";
import SupplierProfile from "@/pages/SupplierProfile";
import CustomerProfile from "@/pages/CustomerProfile";
import WalletTopup from "@/pages/WalletTopup";
import WalletSuccess from "@/pages/WalletSuccess";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import NotFound from "@/pages/not-found";
import type { UserRole } from "@shared/schema";

function DashboardRouter() {
  const { user } = useAuth();
  
  // Redirect to role-specific dashboard if accessing root
  const RootRedirect = () => {
    const roleRedirects: Record<string, string> = {
      customer: "/customer/dashboard",
      workshop: "/workshop/dashboard",
      supplier: "/supplier/dashboard",
      runner: "/runner/dashboard",
      admin: "/admin/dashboard",
      staff: "/staff/dashboard",
    };
    
    const redirectPath = user?.role ? roleRedirects[user.role] : "/customer/dashboard";
    return <Redirect to={redirectPath} />;
  };

  return (
    <Switch>
      {/* Role-specific dashboard routes */}
      <Route path="/customer/dashboard">
        {() => <ProtectedRoute component={CustomerDashboard} allowedRoles={['customer']} />}
      </Route>
      <Route path="/customer/bookings">
        {() => <ProtectedRoute component={CustomerBookings} allowedRoles={['customer']} />}
      </Route>
      <Route path="/customer/history">
        {() => <ProtectedRoute component={CustomerHistory} allowedRoles={['customer']} />}
      </Route>
      <Route path="/customer/wallet">
        {() => <ProtectedRoute component={CustomerWallet} allowedRoles={['customer']} />}
      </Route>
      <Route path="/workshop/dashboard/:section?">
        {() => <ProtectedRoute component={WorkshopDashboard} allowedRoles={['workshop']} />}
      </Route>
      <Route path="/staff/dashboard">
        {() => <ProtectedRoute component={StaffDashboard} allowedRoles={['staff']} />}
      </Route>
      <Route path="/staff/profile">
        {() => <ProtectedRoute component={StaffProfile} allowedRoles={['staff']} />}
      </Route>
      {/* Redirect legacy /workshop to /workshop/dashboard */}
      <Route path="/workshop">
        {() => <Redirect to="/workshop/dashboard" />}
      </Route>
      {/* Marketplace V2 Routes (Nov 2025) */}
      <Route path="/workshop/marketplace">
        {() => <ProtectedRoute component={MarketplaceLanding} allowedRoles={['workshop']} />}
      </Route>
      <Route path="/workshop/marketplace/:type">
        {() => <ProtectedRoute component={SupplierGrid} allowedRoles={['workshop']} />}
      </Route>
      <Route path="/workshop/marketplace/shop/:supplierId">
        {() => <ProtectedRoute component={SupplierStore} allowedRoles={['workshop']} />}
      </Route>
      <Route path="/workshop/cart">
        {() => <ProtectedRoute component={WorkshopCart} allowedRoles={['workshop']} />}
      </Route>
      <Route path="/workshop/orders">
        {() => <ProtectedRoute component={WorkshopOrders} allowedRoles={['workshop']} />}
      </Route>
      <Route path="/workshop/inventory">
        {() => <ProtectedRoute component={WorkshopInventory} allowedRoles={['workshop']} />}
      </Route>
      <Route path="/workshop/attendance">
        {() => <ProtectedRoute component={StaffAttendance} />}
      </Route>
      <Route path="/workshop/settings">
        {() => <ProtectedRoute component={WorkshopSettings} allowedRoles={['workshop']} />}
      </Route>
      <Route path="/jobs/:id">
        {() => <ProtectedRoute component={JobDetail} allowedRoles={['workshop']} />}
      </Route>
      <Route path="/customer/jobs/:id">
        {() => <ProtectedRoute component={CustomerJobView} allowedRoles={['customer']} />}
      </Route>
      <Route path="/supplier/dashboard">
        {() => <ProtectedRoute component={SupplierDashboard} allowedRoles={['supplier']} />}
      </Route>
      <Route path="/supplier/products">
        {() => <ProtectedRoute component={SupplierProducts} allowedRoles={['supplier']} />}
      </Route>
      <Route path="/supplier/orders">
        {() => <ProtectedRoute component={SupplierOrders} allowedRoles={['supplier']} />}
      </Route>
      <Route path="/customer/jobs">
        {() => <ProtectedRoute component={CustomerJobs} allowedRoles={['customer']} />}
      </Route>
      <Route path="/runner/dashboard">
        {() => <ProtectedRoute component={RunnerDashboard} allowedRoles={['runner']} />}
      </Route>
      <Route path="/runner/jobs">
        {() => <ProtectedRoute component={RunnerJobs} allowedRoles={['runner']} />}
      </Route>
      <Route path="/runner/gps">
        {() => <ProtectedRoute component={RunnerLiveMap} allowedRoles={['runner']} />}
      </Route>
      <Route path="/runner/wallet">
        {() => <ProtectedRoute component={RunnerWallet} allowedRoles={['runner']} />}
      </Route>
      <Route path="/runner/settings">
        {() => <ProtectedRoute component={RunnerSettings} allowedRoles={['runner']} />}
      </Route>
      <Route path="/admin/dashboard">
        {() => <ProtectedRoute component={AdminDashboard} allowedRoles={['admin']} />}
      </Route>
      
      {/* Other feature routes - protected but accessible by all authenticated users */}
      <Route path="/orders">
        {() => <ProtectedRoute component={Orders} />}
      </Route>
      <Route path="/parts">
        {() => <ProtectedRoute component={Parts} />}
      </Route>
      <Route path="/jobs">
        {() => <ProtectedRoute component={Jobs} />}
      </Route>
      <Route path="/deliveries">
        {() => <ProtectedRoute component={Deliveries} />}
      </Route>
      <Route path="/book-service">
        {() => <ProtectedRoute component={BookService} />}
      </Route>
      <Route path="/workshop/:id/details">
        {() => <ProtectedRoute component={WorkshopDetails} allowedRoles={['customer']} />}
      </Route>
      <Route path="/notifications">
        {() => <ProtectedRoute component={Notifications} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>
      
      {/* Chat and Profile Routes */}
      <Route path="/chat">
        {() => <ProtectedRoute component={ChatPage} />}
      </Route>
      <Route path="/workshop/profile">
        {() => <ProtectedRoute component={WorkshopProfile} allowedRoles={['workshop']} />}
      </Route>
      <Route path="/supplier/profile">
        {() => <ProtectedRoute component={SupplierProfile} allowedRoles={['supplier']} />}
      </Route>
      <Route path="/customer/profile">
        {() => <ProtectedRoute component={CustomerProfile} allowedRoles={['customer']} />}
      </Route>
      
      {/* Wallet Routes */}
      <Route path="/wallet/topup">
        {() => <ProtectedRoute component={WalletTopup} />}
      </Route>
      <Route path="/wallet-success">
        {() => <ProtectedRoute component={WalletSuccess} />}
      </Route>
      
      {/* Root redirect - must be last to allow specific routes to match first */}
      <Route path="/">
        {() => <ProtectedRoute component={RootRedirect} />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Public routes - always accessible regardless of auth status
  const alwaysPublicRoutes = ['/privacy', '/terms'];
  if (alwaysPublicRoutes.some(route => location.startsWith(route))) {
    return (
      <Switch>
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
      </Switch>
    );
  }

  // Public routes (login, signup, admin-setup) - accessible when not authenticated
  if (!isAuthenticated) {
    const publicRoutes = ['/login', '/signup', '/admin-setup'];
    
    // If not on a public route, redirect to login
    if (!publicRoutes.includes(location)) {
      return <Redirect to="/login" />;
    }
    
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/admin-setup" component={AdminSetup} />
      </Switch>
    );
  }

  // Protected routes - only accessible when authenticated
  const roleRedirects: Record<string, string> = {
    customer: "/customer/dashboard",
    workshop: "/workshop/dashboard",
    supplier: "/supplier/dashboard",
    runner: "/runner/dashboard",
    towing: "/towing/dashboard",
    admin: "/admin/dashboard",
  };
  
  const redirectPath = user?.role ? roleRedirects[user.role] : "/customer/dashboard";

  return (
    <Switch>
      {/* Admin setup always accessible even when logged in */}
      <Route path="/admin-setup" component={AdminSetup} />
      
      {/* Redirect authenticated users away from login/signup pages */}
      <Route path="/login">
        {() => <Redirect to={redirectPath} />}
      </Route>
      <Route path="/signup">
        {() => <Redirect to={redirectPath} />}
      </Route>
      
      {/* Dashboard routes with RoleDashboardLayout */}
      <Route>
        {() => (
          <RoleDashboardLayout>
            <div className={`max-w-7xl mx-auto p-4 sm:p-8 ${user?.role && ['workshop', 'supplier', 'customer', 'staff'].includes(user.role) ? 'pb-20 sm:pb-8' : 'pb-8'}`}>
              <DashboardRouter />
            </div>
            {user?.role && ['workshop', 'supplier', 'customer', 'staff'].includes(user.role) && (
              <MobileBottomNav userRole={user.role} />
            )}
          </RoleDashboardLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('splashShown');
    if (hasSeenSplash) {
      setShowSplash(false);
      setSplashComplete(true);
    }
  }, []);

  const handleSplashFinished = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
    setSplashComplete(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="default">
        <LanguageProvider>
          <SocketProvider>
            <TooltipProvider>
              <Toaster />
              {showSplash && <SplashScreen onFinished={handleSplashFinished} />}
              {splashComplete && <Router />}
            </TooltipProvider>
          </SocketProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
