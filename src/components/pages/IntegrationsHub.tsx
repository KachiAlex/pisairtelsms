import React, { useState } from 'react';
import { CreditCard, Fingerprint, BookOpen, KeyRound } from 'lucide-react';
import PaymentGateway from './integrations/PaymentGateway';
import { BiometricDevices } from './integrations/BiometricDevices';
import { LMSIntegration } from './integrations/LMSIntegration';
import { APIManagement } from './APIManagement';

const TABS = [
  { id: 'payment-gateway',   label: 'Payment Gateway',    Icon: CreditCard  },
  { id: 'biometric-devices', label: 'Biometric Devices',  Icon: Fingerprint },
  { id: 'lms',               label: 'LMS Integration',    Icon: BookOpen    },
  { id: 'api-management',    label: 'API Management',     Icon: KeyRound    },
] as const;

type TabId = typeof TABS[number]['id'];

export function IntegrationsHub() {
  const [activeTab, setActiveTab] = useState<TabId>('payment-gateway');

  return (
    <div className="space-y-0">
      {/* Tab bar */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <nav className="flex gap-0 overflow-x-auto" aria-label="Integration tabs">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                activeTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'payment-gateway'   && <PaymentGateway />}
        {activeTab === 'biometric-devices' && <BiometricDevices />}
        {activeTab === 'lms'               && <LMSIntegration />}
        {activeTab === 'api-management'    && <APIManagement />}
      </div>
    </div>
  );
}

export default IntegrationsHub;
