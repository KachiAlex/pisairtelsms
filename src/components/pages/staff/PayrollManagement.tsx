import React, { useState } from 'react'
import { DollarSign, Calendar, Settings, FileText, HandCoins, Receipt } from 'lucide-react'
import { PayrollSchedules } from './payroll/PayrollSchedules'
import { PayrollRules } from './payroll/PayrollRules'
import { PayrollRuns } from './payroll/PayrollRuns'
import { PayslipViewer } from './payroll/PayslipViewer'
import { SalaryAdvances } from './payroll/SalaryAdvances'
import { TaxCompliance } from './payroll/TaxCompliance'

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

export function PayrollManagement() {
  const [activeTab, setActiveTab] = useState('runs')

  const tabs = [
    { key: 'runs', label: 'Payroll Runs', icon: DollarSign },
    { key: 'schedules', label: 'Schedules', icon: Calendar },
    { key: 'rules', label: 'Rules Engine', icon: Settings },
    { key: 'payslips', label: 'Payslips', icon: FileText },
    { key: 'advances', label: 'Advances & Loans', icon: HandCoins },
    { key: 'tax', label: 'Tax & Compliance', icon: Receipt },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map(tab => (
          <TabButton
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </div>

      {activeTab === 'runs' && <PayrollRuns />}
      {activeTab === 'schedules' && <PayrollSchedules />}
      {activeTab === 'rules' && <PayrollRules />}
      {activeTab === 'payslips' && <PayslipViewer />}
      {activeTab === 'advances' && <SalaryAdvances />}
      {activeTab === 'tax' && <TaxCompliance />}
    </div>
  )
}

export default PayrollManagement
