import { PropsWithChildren } from "react";

export function TeslaDashboardLayout({ 
  children
}: PropsWithChildren) {
  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#111] to-[#000] text-gray-100"
      data-testid="tesla-dashboard-layout"
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  );
}
