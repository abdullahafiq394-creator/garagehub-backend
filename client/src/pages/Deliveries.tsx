import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Deliveries() {
  const { t } = useLanguage();
  const activeDeliveries = [
    {
      id: "DEL-001",
      from: "Auto Parts Malaysia",
      to: "Bengkel Setia Jaya",
      items: 5,
      payment: "RM 25.00",
      status: "assigned_runner" as const,
    },
    {
      id: "DEL-002",
      from: "Premium Motors Supply",
      to: "AutoFix Workshop",
      items: 3,
      payment: "RM 30.00",
      status: "delivering" as const,
    },
  ];

  const availableJobs = [
    {
      id: "DEL-003",
      from: "Spare Parts Central",
      to: "Mega Auto Service",
      distance: "3.2 km",
      payment: "RM 20.00",
    },
    {
      id: "DEL-004",
      from: "Quality Auto Parts",
      to: "Express Car Care",
      distance: "5.8 km",
      payment: "RM 28.00",
    },
  ];

  const completedDeliveries = [
    {
      id: "DEL-100",
      from: "Auto Parts Central",
      to: "City Workshop",
      payment: "RM 22.00",
      completedAt: "2024-11-10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("runner.jobs.title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("runner.jobs.subtitle")}
        </p>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active">
            {t("runner.jobs.activeTab.title")} ({activeDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="available" data-testid="tab-available">
            {t("runner.jobs.availableTab.title")} ({availableJobs.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            {t("runner.jobs.completedTab.title")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("runner.jobs.activeTab.title")}</CardTitle>
              <CardDescription>{t("runner.jobs.activeTab.desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="p-4 rounded-md border space-y-3"
                    data-testid={`delivery-${delivery.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <p className="font-medium font-mono">{delivery.id}</p>
                        <p className="text-sm">{t("runner.jobs.card.from")}: {delivery.from}</p>
                        <p className="text-sm">{t("runner.jobs.card.to")}: {delivery.to}</p>
                        <p className="text-sm text-muted-foreground">{delivery.items} {t("runner.jobs.card.itemsCount")}</p>
                      </div>
                      <StatusBadge status={delivery.status} />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="text-sm font-mono font-semibold text-primary">
                        {delivery.payment}
                      </p>
                      <Button size="sm" data-testid={`button-update-${delivery.id}`}>
                        {t("runner.jobs.card.updateStatus")}
                      </Button>
                    </div>
                  </div>
                ))}
                {activeDeliveries.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">{t("runner.jobs.activeTab.empty")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("runner.jobs.availableTab.title")}</CardTitle>
              <CardDescription>{t("runner.jobs.availableTab.desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-md border space-y-3 hover-elevate"
                    data-testid={`job-${job.id}`}
                  >
                    <div className="space-y-1">
                      <p className="font-medium font-mono">{job.id}</p>
                      <p className="text-sm">{t("runner.jobs.card.from")}: {job.from}</p>
                      <p className="text-sm">{t("runner.jobs.card.to")}: {job.to}</p>
                      <p className="text-sm text-muted-foreground">{job.distance}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="text-sm font-mono font-semibold text-primary">
                        {job.payment}
                      </p>
                      <Button size="sm" data-testid={`button-accept-${job.id}`}>
                        {t("runner.jobs.availableTab.acceptJob")}
                      </Button>
                    </div>
                  </div>
                ))}
                {availableJobs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">{t("runner.jobs.availableTab.empty")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("runner.jobs.completedTab.title")}</CardTitle>
              <CardDescription>{t("runner.jobs.completedTab.desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="flex items-start justify-between p-4 rounded-md border"
                    data-testid={`completed-${delivery.id}`}
                  >
                    <div className="space-y-1 flex-1">
                      <p className="font-medium font-mono">{delivery.id}</p>
                      <p className="text-sm">{t("runner.jobs.card.from")}: {delivery.from}</p>
                      <p className="text-sm">{t("runner.jobs.card.to")}: {delivery.to}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(delivery.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm font-mono font-semibold">{delivery.payment}</p>
                  </div>
                ))}
                {completedDeliveries.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">{t("runner.jobs.completedTab.empty")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
