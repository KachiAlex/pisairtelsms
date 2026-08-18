import React, { useState } from 'react';
import { CreditCard, Fingerprint, BookOpen, KeyRound, Webhook, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import PaymentGateway from './integrations/PaymentGateway';
import { BiometricDevices } from './integrations/BiometricDevices';
import { LMSIntegration } from './integrations/LMSIntegration';
import { APIManagement } from './APIManagement';

export function IntegrationsHub() {
  const [activeTab, setActiveTab] = useState('payment-gateway');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Integrations</p>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Integrations Hub</h1>
          <p className="text-sm text-gray-600">Connect payment gateways, biometric devices, LMS platforms, and manage API keys.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
            <Zap className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">4 Services</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-100">
            <Webhook className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">Webhooks Active</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl w-fit">
          <TabsTrigger value="payment-gateway" className="rounded-lg px-6 py-2">
            <CreditCard className="w-4 h-4 mr-2" /> Payment Gateway
          </TabsTrigger>
          <TabsTrigger value="biometric-devices" className="rounded-lg px-6 py-2">
            <Fingerprint className="w-4 h-4 mr-2" /> Biometric Devices
          </TabsTrigger>
          <TabsTrigger value="lms" className="rounded-lg px-6 py-2">
            <BookOpen className="w-4 h-4 mr-2" /> LMS Integration
          </TabsTrigger>
          <TabsTrigger value="api-management" className="rounded-lg px-6 py-2">
            <KeyRound className="w-4 h-4 mr-2" /> API Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment-gateway" className="mt-0">
          <PaymentGateway />
        </TabsContent>
        <TabsContent value="biometric-devices" className="mt-0">
          <BiometricDevices />
        </TabsContent>
        <TabsContent value="lms" className="mt-0">
          <LMSIntegration />
        </TabsContent>
        <TabsContent value="api-management" className="mt-0">
          <APIManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default IntegrationsHub;
