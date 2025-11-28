import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";

interface CSVUploadFormProps {
  supplierId: string;
  onSuccess: () => void;
}

export function CSVUploadForm({ supplierId, onSuccess }: CSVUploadFormProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const downloadTemplate = () => {
    const csvContent = "name,sku,description,category,price,stockQuantity,imageUrl\n" +
      "Brake Pads Front,BP-001,High quality ceramic brake pads,Brakes,89.90,50,\n" +
      "Oil Filter,OF-002,Premium oil filter for most vehicles,Filters,15.50,100,\n" +
      "Spark Plug,SP-003,Iridium spark plug,Ignition,12.00,200,";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: t("supplier.csvUpload.toasts.invalidFileTitle"),
          description: t("supplier.csvUpload.toasts.invalidFileDesc"),
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      parseCSVPreview(selectedFile);
    }
  };

  const parseCSVPreview = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1, 6).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index]?.trim() || '';
        });
        return obj;
      });
      
      setPreview(data);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: t("supplier.csvUpload.toasts.noFileTitle"),
        description: t("supplier.csvUpload.toasts.noFileDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('csv', file);
      formData.append('supplierId', supplierId);

      const response = await fetch('/api/supplier/products/bulk-csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      toast({
        title: t("supplier.csvUpload.toasts.successTitle"),
        description: `${result.count} ${t("supplier.csvUpload.toasts.successDesc")}`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/parts'] });
      setFile(null);
      setPreview([]);
      onSuccess();
    } catch (error) {
      toast({
        title: t("supplier.csvUpload.toasts.uploadFailedTitle"),
        description: t("supplier.csvUpload.toasts.uploadFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-dashed bg-muted/20">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("supplier.csvUpload.title")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("supplier.csvUpload.description")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="gap-2"
              data-testid="button-download-template"
            >
              <Download className="h-4 w-4" />
              {t("supplier.csvUpload.downloadTemplate")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="csv-file">{t("supplier.csvUpload.selectFile")}</Label>
        <Input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          data-testid="input-csv-file"
        />
        {file && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            {file.name}
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4 text-primary" />
                {t("supplier.csvUpload.preview")}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{t("supplier.csvUpload.tableName")}</th>
                      <th className="text-left p-2">{t("supplier.csvUpload.tableSKU")}</th>
                      <th className="text-left p-2">{t("supplier.csvUpload.tableCategory")}</th>
                      <th className="text-left p-2">{t("supplier.csvUpload.tablePrice")}</th>
                      <th className="text-left p-2">{t("supplier.csvUpload.tableStock")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{row.name}</td>
                        <td className="p-2">{row.sku}</td>
                        <td className="p-2">{row.category}</td>
                        <td className="p-2">RM {row.price}</td>
                        <td className="p-2">{row.stockQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="w-full"
        data-testid="button-upload-csv"
      >
        {isUploading ? t("supplier.csvUpload.importing") : t("supplier.csvUpload.importProducts")}
      </Button>
    </div>
  );
}
