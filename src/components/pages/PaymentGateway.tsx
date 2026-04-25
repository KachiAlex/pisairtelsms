import React from 'react'
import { CreditCard, Shield, RefreshCcw, Activity, AlertTriangle, CheckCircle2, Plug, KeyRound, ServerCog } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Progress } from '../ui/progress'

const providerMatrix = [
  { id: 'Paystack', status: 'Operational', uptime: 99.97, settlement: 'T+1', currency: 'NGN' },
  { id: 'Flutterwave', status: 'Degraded', uptime: 97.81, settlement: 'T+2', currency: 'NGN / USD' },
  { id: 'Interswitch', status: 'Planned maintenance', uptime: 95.42, settlement: 'T+3', currency: 'NGN' },
]

const paymentFeed = [
  { id: 'PMT-4412', cohort: 'SS 1', channel: 'Paystack', status: 'Success', amount: '₦215,000', time: '08:12 AM' },
  { id: 'PMT-4410', cohort: 'JSS 2', channel: 'Flutterwave', status: 'Pending', amount: '₦146,500', time: '07:58 AM' },
  { id: 'PMT-4409', cohort: 'Primary 4', channel: 'Paystack', status: 'Failed', amount: '₦82,000', time: '07:44 AM' },
]

const webhookStatuses = [
  { id: 'fees.received', status: 'Healthy', latency: '450ms', retries: 0 },
  { id: 'refund.processed', status: 'Delayed', latency: '2.4s', retries: 3 },
  { id: 'charge.failed', status: 'Healthy', latency: '620ms', retries: 0 },
]

const settlementQueue = [
  { id: 'SET-209', provider: 'Paystack', amount: '₦1.8M', eta: 'Today 3 PM', reconciled: 'Yes' },
  { id: 'SET-208', provider: 'Flutterwave', amount: '₦740k', eta: 'Tomorrow', reconciled: 'No' },
]

const statusVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  Success: 'default',
  Pending: 'warning',
  Failed: 'destructive',
  Operational: 'default',
  Degraded: 'warning',
  'Planned maintenance': 'secondary',
  Healthy: 'default',
  Delayed: 'warning',
}

export function PaymentGateway() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Integrations</p>
          <h1 className="text-2xl font-bold text-gray-900">Payment gateway</h1>
          <p className="text-sm text-gray-600">Monitor provider uptime, webhook delivery, and settlement status across all channels.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" /> Sync providers
          </Button>
          <Button>
            <CreditCard className="h-4 w-4 mr-2" /> Raise invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Fees collected (today)</p>
            <p className="text-3xl font-semibold text-gray-900">₦4.2M</p>
            <p className="text-xs text-gray-500">+18% vs yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Success rate</p>
            <p className="text-3xl font-semibold text-emerald-600">96.2%</p>
            <p className="text-xs text-gray-500">Last 500 attempts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Settlements pending</p>
            <p className="text-3xl font-semibold text-gray-900">2</p>
            <p className="text-xs text-gray-500">Total ₦2.5M</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Active webhooks</p>
            <p className="text-3xl font-semibold text-gray-900">12</p>
            <p className="text-xs text-gray-500">2 flagged this week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider matrix</CardTitle>
          <CardDescription>Compare uptime, settlement, and currency coverage.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uptime (30d)</TableHead>
                <TableHead>Settlement SLA</TableHead>
                <TableHead>Currencies</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providerMatrix.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell className="font-medium text-gray-900">{provider.id}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[provider.status] || 'secondary'}>{provider.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-28">
                        <Progress value={provider.uptime} />
                      </div>
                      <span className="text-sm text-gray-600">{provider.uptime}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{provider.settlement}</TableCell>
                  <TableCell>{provider.currency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
            <CardDescription>Latency and status per cohort.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentFeed.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{payment.cohort}</p>
                  <p className="text-sm text-gray-500">{payment.channel} • {payment.amount}</p>
                  <p className="text-xs text-gray-400">{payment.time}</p>
                </div>
                <Badge variant={statusVariant[payment.status] || 'secondary'}>{payment.status}</Badge>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full">
              <Activity className="h-4 w-4 mr-2" /> View transaction log
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhook status</CardTitle>
            <CardDescription>Delivery health across subscribed topics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {webhookStatuses.map((hook) => (
              <div key={hook.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{hook.id}</p>
                  <p className="text-sm text-gray-500">Latency {hook.latency}</p>
                  <p className="text-xs text-gray-400">Retries: {hook.retries}</p>
                </div>
                <Badge variant={statusVariant[hook.status] || 'secondary'}>{hook.status}</Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full">
              <Plug className="h-4 w-4 mr-2" /> Manage subscriptions
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settlement queue</CardTitle>
          <CardDescription>Reconciliation status across providers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {settlementQueue.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{item.provider}</p>
                <p className="text-sm text-gray-500">{item.amount}</p>
                <p className="text-xs text-gray-400">ETA {item.eta}</p>
              </div>
              <Badge variant={item.reconciled === 'Yes' ? 'default' : 'warning'}>{item.reconciled === 'Yes' ? 'Reconciled' : 'Pending'}</Badge>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="w-full">
            <ServerCog className="h-4 w-4 mr-2" /> Open reconciliation
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-900">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <p>Flutterwave settlement latency exceeds SLA. Notify finance before publishing debt reminders.</p>
        </div>
        <Button size="sm">
          <CheckCircle2 className="h-4 w-4 mr-2" /> Send incident brief
        </Button>
      </div>
    </div>
  )
}
export default PaymentGateway;
