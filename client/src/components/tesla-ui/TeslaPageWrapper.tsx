import { PropsWithChildren } from "react";
import { TeslaDashboardLayout } from "./TeslaDashboardLayout";
import { TeslaTopBar } from "./TeslaTopBar";

interface TeslaPageWrapperProps {
  title: string;
  subtitle?: string;
}

export function TeslaPageWrapper({ 
  title, 
  subtitle,
  children 
}: PropsWithChildren<TeslaPageWrapperProps>) {
  return (
    <TeslaDashboardLayout>
      <div className="mx-auto max-w-[1600px] p-4">
        <TeslaTopBar title={title} subtitle={subtitle} />
        {children}
      </div>
    </TeslaDashboardLayout>
  );
}
