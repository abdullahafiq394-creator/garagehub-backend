import cron from 'node-cron';
import { DateTime } from 'luxon';
import { storage } from './storage';

// Schedule daily report generation at 11:59 PM every day
export function startCronJobs() {
  // Daily Reports - Generate at 11:59 PM
  cron.schedule('59 23 * * *', async () => {
    console.log('[CRON] Running daily report generation...');
    
    try {
      // Get all active workshops
      const allWorkshops = await storage.listWorkshops();
      
      for (const workshop of allWorkshops) {
        try {
          // Calculate date range for today in Malaysia timezone (Asia/Kuala_Lumpur)
          const now = DateTime.now().setZone('Asia/Kuala_Lumpur');
          const startOfDay = now.startOf('day').toJSDate(); // 00:00:00 MYT
          const endOfDay = now.endOf('day').toJSDate(); // 23:59:59.999 MYT
          
          // Get financial summary from financialTransactions table
          const summary = await storage.getFinancialSummary(
            workshop.id,
            startOfDay,
            endOfDay
          );
          
          // Get workshop settings for zakat and tax calculations
          let settings = await storage.getWorkshopSettings(workshop.id);
          if (!settings) {
            settings = await storage.createWorkshopSettings({
              workshopId: workshop.id,
              zakatRate: '2.50',
              taxRate: '10.00',
              zakatEnabled: true,
              taxEnabled: true,
            });
          }
          
          // Calculate zakat and tax from net profit
          const zakatRate = parseFloat(settings.zakatRate || '2.50');
          const taxRate = parseFloat(settings.taxRate || '10.00');
          const zakatAmount = settings.zakatEnabled ? (summary.netProfit * zakatRate) / 100 : 0;
          const taxAmount = settings.taxEnabled ? (summary.netProfit * taxRate) / 100 : 0;
          
          // Count total jobs completed today
          const jobs = await storage.getJobsByWorkshop(workshop.id);
          const totalJobs = jobs.filter(j => 
            j.status === 'completed' && 
            j.updatedAt && 
            new Date(j.updatedAt) >= startOfDay && 
            new Date(j.updatedAt) <= endOfDay
          ).length;
          
          // Create daily report using financialTransactions data
          const report = await storage.createDailyReport({
            workshopId: workshop.id,
            reportDate: new Date(), // Today's date
            totalSales: summary.totalIncome.toString(),
            totalExpenses: summary.totalExpense.toString(),
            profit: summary.netProfit.toString(),
            totalJobs,
            zakatAmount: zakatAmount.toString(),
            taxAmount: taxAmount.toString(),
          });
          
          console.log(`[CRON] Generated daily report for workshop ${workshop.name}:`, {
            reportId: report.id,
            date: report.reportDate,
            totalSales: report.totalSales,
            profit: report.profit,
            totalJobs: report.totalJobs
          });
          
          // TODO: Emit Socket.io event to notify workshop owner
          // io.to(`workshop-${workshop.id}`).emit('daily-report-generated', report);
          
        } catch (error) {
          console.error(`[CRON] Failed to generate report for workshop ${workshop.id}:`, error);
        }
      }
      
      console.log('[CRON] Daily report generation completed');
    } catch (error) {
      console.error('[CRON] Daily report generation failed:', error);
    }
  }, {
    timezone: "Asia/Kuala_Lumpur" // Malaysia timezone
  });
  
  console.log('[CRON] Daily report generation scheduled for 11:59 PM (Asia/Kuala_Lumpur)');
}
