import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Wrench, ShoppingCart, AlertCircle, Plus } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { JobStatus, OrderStatus } from "@shared/schema";

interface WorkshopJob {
  id: string;
  workshopId: string;
  customerId: string;
  vehicleModel: string;
  vehiclePlate: string;
  description: string;
  status: JobStatus;
  estimatedCost: number;
  finalCost: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface SupplierOrder {
  id: string;
  workshopId: string;
  status: OrderStatus;
  totalAmount: string;
  createdAt: string;
}

interface OverviewTabProps {
  workshopId: string;
}

export default function OverviewTab({ workshopId }: OverviewTabProps) {
  const { data: jobs, isLoading: jobsLoading } = useQuery<WorkshopJob[]>({
    queryKey: ['/api/workshop-dashboard/jobs'],
  });
  
  const { data: orders, isLoading: ordersLoading } = useQuery<SupplierOrder[]>({
    queryKey: ['/api/orders'],
  });

  const activeJobs = jobs?.filter(j => j.status === 'in_progress').length || 0;
  const pendingOrders = orders?.length || 0;
  const recentJobs = jobs?.slice(0, 2) || [];
  const recentOrders = orders?.slice(0, 2) || [];

  const isLoading = jobsLoading || ordersLoading;

  return (
    <>
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Active Jobs"
              value={activeJobs}
              icon={Wrench}
              description="Currently in progress"
              data-testid="stat-active-jobs"
            />
            <StatCard
              title="Pending Orders"
              value={pendingOrders}
              icon={ShoppingCart}
              description="Parts orders awaiting delivery"
              data-testid="stat-pending-orders"
            />
            <StatCard
              title="Total Jobs"
              value={jobs?.length || 0}
              icon={AlertCircle}
              description="All service jobs"
              data-testid="stat-total-jobs"
            />
            <StatCard
              title="Total Orders"
              value={orders?.length || 0}
              icon={DollarSign}
              description="All parts orders"
              data-testid="stat-total-orders"
            />
          </>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <div>
              <CardTitle>Active Jobs</CardTitle>
              <CardDescription>Recent service jobs in your workshop</CardDescription>
            </div>
            <Button asChild size="sm">
              <Link href="/jobs" data-testid="button-view-all-jobs">
                <Plus className="h-4 w-4 mr-2" />
                New Job
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-4 rounded-md border">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-40 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-start justify-between p-4 rounded-md border hover-elevate"
                    data-testid={`job-${job.id}`}
                  >
                    <div className="space-y-1 flex-1">
                      <p className="font-medium">Customer #{job.customerId.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.vehicleModel} • {job.vehiclePlate}
                      </p>
                      <p className="text-sm">{job.description}</p>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                ))}
                {recentJobs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No active jobs</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <div>
              <CardTitle>Parts Orders</CardTitle>
              <CardDescription>Recent orders from suppliers</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/orders" data-testid="button-view-all-orders">
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-4 rounded-md border">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-start justify-between p-4 rounded-md border hover-elevate"
                    data-testid={`order-${order.id}`}
                  >
                    <div className="space-y-1 flex-1">
                      <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.status.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm font-mono font-semibold">
                        RM {Number(order.totalAmount).toFixed(2)}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                ))}
                {recentOrders.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No recent orders</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for your workshop</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/jobs" data-testid="button-create-job">
              <Wrench className="h-4 w-4 mr-2" />
              Create New Job
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/orders" data-testid="button-order-parts">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Order Parts
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/workshop/marketplace" data-testid="button-browse-marketplace">
              Browse Marketplace
            </Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
