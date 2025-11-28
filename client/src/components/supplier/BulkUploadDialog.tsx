import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Upload, Camera } from "lucide-react";
import { ManualProductForm } from "./ManualProductForm";
import { CSVUploadForm } from "./CSVUploadForm";
import { AIImageUploadForm } from "./AIImageUploadForm";
import { useLanguage } from "@/contexts/LanguageContext";

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
}

export function BulkUploadDialog({ open, onOpenChange, supplierId }: BulkUploadDialogProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("manual");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("supplier.bulkUpload.title")}</DialogTitle>
          <DialogDescription>
            {t("supplier.bulkUpload.description")}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="gap-2" data-testid="tab-manual">
              <FileText className="h-4 w-4" />
              {t("supplier.bulkUpload.manualEntry")}
            </TabsTrigger>
            <TabsTrigger value="csv" className="gap-2" data-testid="tab-csv">
              <Upload className="h-4 w-4" />
              {t("supplier.bulkUpload.csvImport")}
            </TabsTrigger>
            <TabsTrigger value="ai-image" className="gap-2" data-testid="tab-ai-image">
              <Camera className="h-4 w-4" />
              {t("supplier.bulkUpload.aiImageUpload")}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="manual" className="mt-0">
              <ManualProductForm supplierId={supplierId} onSuccess={() => onOpenChange(false)} />
            </TabsContent>

            <TabsContent value="csv" className="mt-0">
              <CSVUploadForm supplierId={supplierId} onSuccess={() => onOpenChange(false)} />
            </TabsContent>

            <TabsContent value="ai-image" className="mt-0">
              <AIImageUploadForm supplierId={supplierId} onSuccess={() => onOpenChange(false)} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
