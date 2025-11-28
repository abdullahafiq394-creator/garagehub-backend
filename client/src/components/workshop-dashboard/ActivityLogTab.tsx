import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

type ActivityLog = {
  id: string;
  userId: string | null;
  workshopId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: 'success' | 'failure';
  details: any;
  createdAt: string;
};

export default function ActivityLogTab() {
  const [limit, setLimit] = useState<string>('50');
  const [page, setPage] = useState<number>(1);

  const { data: logs, isLoading, error } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity-log', { limit, offset: ((page - 1) * parseInt(limit)).toString() }],
  });

  // Reset to page 1 when limit changes
  const handleLimitChange = (newLimit: string) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handlePreviousPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPage((prev) => prev + 1);
  };

  const hasNextPage = logs && logs.length === parseInt(limit);
  const hasPreviousPage = page > 1;

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('add')) return 'bg-green-500/10 text-green-700 dark:text-green-400';
    if (action.includes('update') || action.includes('edit')) return 'bg-primary/10 text-primary';
    if (action.includes('delete') || action.includes('remove')) return 'bg-red-500/10 text-red-700 dark:text-red-400';
    return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  };

  const getEntityColor = (entity: string | null) => {
    if (!entity) return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    if (entity === 'job') return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
    if (entity === 'expense' || entity === 'transaction') return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
    if (entity === 'staff' || entity === 'payroll') return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400';
    return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  };

  return (
    <div className="space-y-6">
      <Card className="card-glow">
        <CardHeader className="flex flex-col items-center text-center gap-4 space-y-0 pb-4">
          <div className="w-full flex flex-col items-center gap-3">
            <Activity className="h-8 w-8" />
            <div className="text-center">
              <CardTitle className="glow-text text-foreground">Activity Audit Log</CardTitle>
              <CardDescription className="mt-2">
                Complete audit trail of all financial and operational activities
              </CardDescription>
            </div>
          </div>
          <Select value={limit} onValueChange={handleLimitChange}>
            <SelectTrigger className="w-full sm:w-32" data-testid="select-log-limit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load activity logs: {error instanceof Error ? error.message : 'Unknown error'}
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-logs">
              No activity logs found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                      <TableCell className="font-mono text-xs" data-testid={`text-timestamp-${log.id}`}>
                        {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getActionColor(log.action)} data-testid={`badge-action-${log.id}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.entity ? (
                          <Badge variant="outline" className={getEntityColor(log.entity)} data-testid={`badge-entity-${log.id}`}>
                            {log.entity}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400" data-testid={`status-success-${log.id}`}>
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-sm">Success</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600 dark:text-red-400" data-testid={`status-failure-${log.id}`}>
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm">Failure</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs" data-testid={`text-ip-${log.id}`}>
                        {log.ipAddress || '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground" data-testid={`text-details-${log.id}`}>
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} • Showing {logs.length} logs
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={!hasPreviousPage}
                    data-testid="button-previous-page"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!hasNextPage}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
