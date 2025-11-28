import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkshops } from "@/hooks/api/useWorkshops";
import { useLanguage } from "@/contexts/LanguageContext";
import OverviewTab from "@/components/workshop-dashboard/OverviewTab";
import CustomersTab from "@/components/workshop-dashboard/CustomersTab";
import StaffManagementTab from "@/components/workshop-dashboard/StaffManagementTab";
import BookingManagementTab from "@/pages/workshop/BookingManagementTab";
import JobsTab from "@/components/workshop-dashboard/JobsTab";
import PartsRequestsTab from "@/components/workshop-dashboard/PartsRequestsTab";
import InventoryTab from "@/components/workshop-dashboard/InventoryTab";
import MarketplaceTab from "@/components/workshop-dashboard/MarketplaceTab";
import SalesTab from "@/components/workshop-dashboard/SalesTab";
import ManualInvoices from "@/pages/workshop/ManualInvoices";
import CommissionsTab from "@/components/workshop-dashboard/CommissionsTab";
import BayStatusTab from "@/components/workshop-dashboard/BayStatusTab";
import ExpensesTab from "@/components/workshop-dashboard/ExpensesTab";
import FinanceTab from "@/components/workshop-dashboard/FinanceTab";
import PayrollTab from "@/components/workshop-dashboard/PayrollTab";
import ReportsTab from "@/components/workshop-dashboard/ReportsTab";
import ActivityLogTab from "@/components/workshop-dashboard/ActivityLogTab";

export default function WorkshopDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [, params] = useRoute("/workshop/dashboard/:section?");
  const currentSection = params?.section || "overview";

  // Fetch workshop data
  const { data: workshops, isLoading: workshopsLoading } = useWorkshops();
  const userWorkshop = workshops?.find(w => w.userId === user?.id);

  return (
    <div className="max-w-7xl mx-auto">
        {/* Pending Approval Alert */}
        {!workshopsLoading && userWorkshop && !userWorkshop.isVerified && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10 mb-6" data-testid="alert-pending-approval">
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertTitle className="text-yellow-600 dark:text-yellow-400">{t("workshop.dashboard.pendingApproval")}</AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              {t("workshop.dashboard.pendingApprovalDesc")}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {workshopsLoading ? (
          <Card className="card-glow">
            <CardHeader>
              <Skeleton className="h-8 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ) : !userWorkshop ? (
          <Alert data-testid="alert-no-workshop">
            <AlertTitle>{t("workshop.dashboard.noWorkshop")}</AlertTitle>
            <AlertDescription>
              {t("workshop.dashboard.noWorkshopDesc")}
            </AlertDescription>
          </Alert>
        ) : (
          /* Main Dashboard Content - Route based */
          <div className="dashboard-overview">
            {currentSection === "overview" && <OverviewTab workshopId={userWorkshop.id} />}
            {currentSection === "customers" && <CustomersTab workshopId={userWorkshop.id} />}
            {currentSection === "staff" && <StaffManagementTab />}
            {currentSection === "bookings" && <BookingManagementTab workshopId={userWorkshop.id} />}
            {currentSection === "jobs" && <JobsTab workshopId={userWorkshop.id} />}
            {currentSection === "parts-requests" && <PartsRequestsTab workshopId={userWorkshop.id} />}
            {currentSection === "inventory" && <InventoryTab workshopId={userWorkshop.id} />}
            {currentSection === "marketplace" && <MarketplaceTab workshopId={userWorkshop.id} />}
            {currentSection === "sales" && <SalesTab workshopId={userWorkshop.id} />}
            {currentSection === "manual-invoices" && <ManualInvoices />}
            {currentSection === "commissions" && <CommissionsTab workshopId={userWorkshop.id} />}
            {currentSection === "bays" && <BayStatusTab workshopId={userWorkshop.id} />}
            {currentSection === "expenses" && <ExpensesTab workshopId={userWorkshop.id} />}
            {currentSection === "finance" && <FinanceTab workshopId={userWorkshop.id} />}
            {currentSection === "payroll" && <PayrollTab workshopId={userWorkshop.id} />}
            {currentSection === "reports" && <ReportsTab workshopId={userWorkshop.id} />}
            {currentSection === "activity" && <ActivityLogTab />}
          </div>
        )}
    </div>
  );
}
