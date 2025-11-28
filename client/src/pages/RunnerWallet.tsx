import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, History, Wallet } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface Transaction {
  id: string;
  type: string;
  amount: string;
  description: string;
  createdAt: string;
  status: string;
}

interface WalletData {
  id: string;
  userId: string;
  balance: string;
  createdAt: string;
  updatedAt: string;
}

export default function RunnerWallet() {
  const { t } = useLanguage();
  
  // Fetch wallet data
  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ['/api/wallet'],
  });

  // Fetch transaction history
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/wallet/transactions'],
  });

  const balance = wallet ? parseFloat(wallet.balance) : 0;
  
  // Calculate earnings (sum of all credit transactions)
  const totalEarnings = transactions
    ?.filter(t => t.type === 'credit' && t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

  if (walletLoading || transactionsLoading) {
    return (
      <div className="p-2 space-y-2">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-2 md:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      <div className="mb-1">
        <h1 className="text-xl font-bold" data-testid="text-page-title">{t("runner.wallet.title")}</h1>
        <p className="text-foreground text-xs">{t("runner.wallet.subtitle")}</p>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-2 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2.5">
            <CardTitle className="text-xs font-medium">{t("runner.wallet.currentBalance")}</CardTitle>
            <Wallet className="h-3.5 w-3.5 text-foreground" />
          </CardHeader>
          <CardContent className="pb-2.5 pt-1">
            <div className="text-xl font-bold" data-testid="text-current-balance">
              RM {balance.toFixed(2)}
            </div>
            <p className="text-[10px] text-foreground leading-tight">
              {t("runner.wallet.availableForWithdrawal")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2.5">
            <CardTitle className="text-xs font-medium">{t("runner.wallet.totalEarnings")}</CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-foreground" />
          </CardHeader>
          <CardContent className="pb-2.5 pt-1">
            <div className="text-xl font-bold" data-testid="text-total-earnings">
              RM {totalEarnings.toFixed(2)}
            </div>
            <p className="text-[10px] text-foreground leading-tight">
              {t("runner.wallet.allTimeEarnings")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <CardTitle className="text-base">{t("runner.wallet.transactionHistory")}</CardTitle>
          </div>
          <CardDescription className="text-foreground text-xs">{t("runner.wallet.transactionHistoryDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!transactions || transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="text-5xl font-bold text-foreground mb-3">RM</div>
              <p className="text-foreground text-sm" data-testid="text-no-transactions">
                {t("runner.wallet.noTransactions")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                  data-testid={`transaction-${transaction.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm" data-testid={`text-transaction-desc-${transaction.id}`}>
                      {transaction.description}
                    </p>
                    <p className="text-xs text-foreground" data-testid={`text-transaction-date-${transaction.id}`}>
                      {format(new Date(transaction.createdAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={
                        transaction.type === 'credit'
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }
                      data-testid={`badge-transaction-type-${transaction.id}`}
                    >
                      {transaction.type === 'credit' ? t("runner.wallet.credit") : t("runner.wallet.debit")}
                    </Badge>
                    <p
                      className={`font-semibold ${
                        transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'
                      }`}
                      data-testid={`text-transaction-amount-${transaction.id}`}
                    >
                      {transaction.type === 'credit' ? '+' : '-'}RM {parseFloat(transaction.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
