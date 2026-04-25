import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import Dashboard from './finance/Dashboard';
import FeeStructureConfig from './finance/FeeStructureConfig';
import StudentAccounts from './finance/StudentAccounts';
import PaymentProcessing from './finance/PaymentProcessing';
import Reconciliation from './finance/Reconciliation';
import ReportViewer from './finance/ReportViewer';
import AuditLog from './finance/AuditLog';
import OutstandingFees from './finance/OutstandingFees';
import InvoiceManagement from './finance/InvoiceManagement';
import FinancialReports from './finance/FinancialReports';

export function FinanceManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [feeConfigSubTab, setFeeConfigSubTab] = useState('structures');
  const [paymentsSubTab, setPaymentsSubTab] = useState('single');

  const handleRecordPayment = () => {
    setActiveTab('payments');
    setPaymentsSubTab('single');
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
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="fee-config">Fee Config</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
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

        {/* Fee Config Tab with Sub-tabs */}
        <TabsContent value="fee-config" className="space-y-4">
          <Tabs value={feeConfigSubTab} onValueChange={setFeeConfigSubTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="structures">Fee Structures</TabsTrigger>
              <TabsTrigger value="assignments">Fee Assignments</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="structures" className="space-y-4">
              <FeeStructureConfig />
            </TabsContent>

            <TabsContent value="assignments" className="space-y-4">
              <StudentAccounts />
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="text-center text-gray-500 py-8">Fee Structure History</div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Payments Tab with Sub-tabs */}
        <TabsContent value="payments" className="space-y-4">
          <Tabs value={paymentsSubTab} onValueChange={setPaymentsSubTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Record Payment</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-4">
              <PaymentProcessing />
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4">
              <PaymentProcessing />
            </TabsContent>
          </Tabs>
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
