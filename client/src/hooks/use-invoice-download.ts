import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface InvoiceDownloadOptions {
  endpoint: string;
  filename: string;
}

export function useInvoiceDownload() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ endpoint, filename }: InvoiceDownloadOptions) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to generate invoice' }));
        throw new Error(error.message || 'Failed to generate invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Invoice Generated",
        description: "PDF invoice downloaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Invoice Generation Failed",
        description: error.message || "Failed to generate invoice. Please try again.",
        variant: "destructive",
      });
    },
  });
}
