import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import Dashboard from './finance/Dashboard';
import FeeStructureConfig from './finance/FeeStructureConfig';
import StudentAccounts from './finance/StudentAccounts';
import PaymentProcessing from './finance/PaymentProcessing';
import Reconciliation from './finance/Reconciliation';
import AuditLog from './finance/AuditLog';
import OutstandingFees from './finance/OutstandingFees';
import InvoiceManagement from './finance/InvoiceManagement';
import FinancialReports from './finance/FinancialReports';

export function FinanceManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleRecordPayment = () => {
    setActiveTab('payments-single');
  };

  const handleSendReminder = () => {
    console.log('Send reminder clicked');
  };

  const handleViewDefaulters = () => {
    setActiveTab('financial-reports');
  };

  return (
    <div className="space-y-6">
      {/* Main Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-12 gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="fee-structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="fee-assignments">Fee Assignments</TabsTrigger>
          <TabsTrigger value="payments-single">Record Payment</TabsTrigger>
          <TabsTrigger value="payments-bulk">Bulk Upload</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="financial-reports">Financial Reports</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <Dashboard
            onRecordPayment={handleRecordPayment}
            onSendReminder={handleSendReminder}
            onViewDefaulters={handleViewDefaulters}
          />
        </TabsContent>

        {/* Fee Structures Tab */}
        <TabsContent value="fee-structures" className="space-y-4">
          <FeeStructureConfig />
        </TabsContent>

        {/* Fee Assignments Tab */}
        <TabsContent value="fee-assignments" className="space-y-4">
          <StudentAccounts />
        </TabsContent>

        {/* Record Payment Tab */}
        <TabsContent value="payments-single" className="space-y-4">
          <PaymentProcessing />
        </TabsContent>

        {/* Bulk Upload Tab */}
        <TabsContent value="payments-bulk" className="space-y-4">
          <PaymentProcessing />
        </TabsContent>

        {/* Outstanding Fees Tab */}
        <TabsContent value="outstanding" className="space-y-4">
          <OutstandingFees />
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <InvoiceManagement />
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation" className="space-y-4">
          <Reconciliation />
        </TabsContent>

        {/* Financial Reports Tab */}
        <TabsContent value="financial-reports" className="space-y-4">
          <FinancialReports />
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <AuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
export default FinanceManagement;
