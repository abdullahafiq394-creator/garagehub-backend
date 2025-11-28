import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Trophy, DollarSign, BarChart } from "lucide-react";
import type { WorkshopStaff, StaffCommission, WorkshopJob } from "@shared/schema";

interface CommissionsTabProps {
  workshopId: string;
}

export default function CommissionsTab({ workshopId }: CommissionsTabProps) {
  // Fetch data
  const { data: staff } = useQuery<WorkshopStaff[]>({
    queryKey: ["/api/workshop-dashboard/staff"],
  });

  const { data: commissions, isLoading: commissionsLoading } = useQuery<StaffCommission[]>({
    queryKey: ["/api/workshop-dashboard/commissions"],
  });

  const { data: jobs } = useQuery<WorkshopJob[]>({
    queryKey: ["/api/workshop-dashboard/jobs"],
  });

  const completedJobs = jobs?.filter(j => j.status === "completed") || [];

  // Calculate staff performance
  const staffPerformance = staff?.map(s => {
    const staffCommissions = commissions?.filter(c => c.staffId === s.id) || [];
    const staffJobs = completedJobs.filter(j => j.mechanicId === s.id);
    
    const totalCommissions = staffCommissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
    const totalRevenue = staffJobs.reduce((sum, j) => sum + Number(j.actualCost || 0), 0);
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - Number(s.basicSalary || 0)) / totalRevenue * 100) : 0;

    return {
      id: s.id,
      name: s.name,
      role: s.role,
      salary: Number(s.basicSalary || 0),
      commissions: totalCommissions,
      jobsCompleted: staffJobs.length,
      revenue: totalRevenue,
      profitMargin,
      totalEarnings: Number(s.basicSalary || 0) + totalCommissions,
    };
  }).filter(s => s.jobsCompleted > 0).sort((a, b) => b.revenue - a.revenue) || [];

  // Calculate overall stats
  const totalCommissions = commissions?.reduce((sum, c) => sum + Number(c.commissionAmount), 0) || 0;
  const totalRevenue = completedJobs.reduce((sum, j) => sum + Number(j.actualCost || 0), 0);
  const totalSalaries = staff?.reduce((sum, s) => sum + Number(s.basicSalary || 0), 0) || 0;
  const totalProfit = totalRevenue - totalSalaries - totalCommissions;
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Commissions</p>
                <p className="text-2xl font-bold font-mono">RM {totalCommissions.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold font-mono">RM {totalRevenue.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold font-mono ${totalProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  RM {totalProfit.toFixed(2)}
                </p>
              </div>
              <BarChart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className={`text-2xl font-bold ${overallMargin >= 20 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {overallMargin.toFixed(1)}%
                </p>
              </div>
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      {staffPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <CardTitle>Top Performers</CardTitle>
            </div>
            <CardDescription>
              Staff ranked by revenue generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {staffPerformance.slice(0, 3).map((staff, index) => (
                <div key={staff.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{staff.name}</div>
                      <div className="text-sm text-muted-foreground">{staff.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-lg">RM {staff.revenue.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">{staff.jobsCompleted} jobs completed</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Performance Overview</CardTitle>
          <CardDescription>
            Detailed breakdown of staff contributions and earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissionsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : staffPerformance.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No performance data available yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Jobs</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Commissions</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffPerformance.map((staff) => (
                    <TableRow key={staff.id} data-testid={`performance-row-${staff.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{staff.name}</div>
                          <div className="text-sm text-muted-foreground">{staff.role}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{staff.jobsCompleted}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">RM {staff.revenue.toFixed(2)}</TableCell>
                      <TableCell className="font-mono">RM {staff.salary.toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-green-600">
                        RM {staff.commissions.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        RM {staff.totalEarnings.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={staff.profitMargin >= 20 ? "default" : "secondary"}>
                          {staff.profitMargin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
