import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  status?: 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
}

export function MetricCard({ title, value, icon: Icon, status = 'good', trend }: MetricCardProps) {
  const statusColors = {
    good: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
    critical: 'bg-red-50 border-red-200',
  };

  const iconColors = {
    good: 'text-green-600',
    warning: 'text-amber-600',
    critical: 'text-red-600',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  return (
    <div className={`rounded-lg border p-4 ${statusColors[status]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`rounded-lg bg-white p-2 ${iconColors[status]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-2 text-xs text-gray-600">
          {trendIcons[trend]} Trend
        </div>
      )}
    </div>
  );
}
