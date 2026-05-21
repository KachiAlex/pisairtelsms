import React, { useState } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { Card } from '../../ui/card';

interface FeeItem {
  id?: string;
  category: string;
  description: string;
  amount: number;
  applicableClasses: string[];
  isMandatory: boolean;
}

interface FeeItemsTableProps {
  items: FeeItem[];
  onUpdate: (index: number, item: FeeItem) => void;
  onRemove: (index: number) => void;
  categories: string[];
  classes: string[];
}

export function FeeItemsTable({
  items,
  onUpdate,
  onRemove,
  categories,
  classes,
}: FeeItemsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRowExpanded = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const handleCategoryChange = (index: number, category: string) => {
    const item = items[index];
    onUpdate(index, { ...item, category });
  };

  const handleDescriptionChange = (index: number, description: string) => {
    const item = items[index];
    onUpdate(index, { ...item, description });
  };

  const handleAmountChange = (index: number, amount: string) => {
    const item = items[index];
    onUpdate(index, { ...item, amount: parseFloat(amount) || 0 });
  };

  const handleClassToggle = (index: number, className: string) => {
    const item = items[index];
    const applicableClasses = item.applicableClasses || [];
    const updated = applicableClasses.includes(className)
      ? applicableClasses.filter(c => c !== className)
      : [...applicableClasses, className];
    onUpdate(index, { ...item, applicableClasses: updated });
  };

  const handleMandatoryToggle = (index: number) => {
    const item = items[index];
    onUpdate(index, { ...item, isMandatory: !item.isMandatory });
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Collapsed View */}
          <div className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100" onClick={() => toggleRowExpanded(index)}>
            <div className="flex items-center gap-4 flex-1">
              <ChevronDown
                className={`w-4 h-4 text-gray-600 transition-transform ${
                  expandedRows.has(index) ? 'rotate-180' : ''
                }`}
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.category || 'Uncategorized'}</p>
                <p className="text-sm text-gray-600">{item.description || 'No description'}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  ₦{item.amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">
                  {item.applicableClasses?.length || 0} classes
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Expanded View */}
          {expandedRows.has(index) && (
            <div className="p-4 border-t border-gray-200 bg-white space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`category-${index}`}>Category</Label>
                  <Select value={item.category} onValueChange={(value) => handleCategoryChange(index, value)}>
                    <SelectTrigger id={`category-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`amount-${index}`}>Amount (₦)</Label>
                  <Input
                    id={`amount-${index}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.amount}
                    onChange={(e) => handleAmountChange(index, e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor={`description-${index}`}>Description</Label>
                <Input
                  id={`description-${index}`}
                  value={item.description}
                  onChange={(e) => handleDescriptionChange(index, e.target.value)}
                  placeholder="e.g., Tuition fees for the term"
                />
              </div>

              <div>
                <Label>Applicable Classes</Label>
                <div className="grid grid-cols-2 gap-3 mt-2 p-3 bg-gray-50 rounded-lg">
                  {classes.map(className => (
                    <div key={className} className="flex items-center gap-2">
                      <Checkbox
                        id={`class-${index}-${className}`}
                        checked={item.applicableClasses?.includes(className) || false}
                        onCheckedChange={() => handleClassToggle(index, className)}
                      />
                      <Label
                        htmlFor={`class-${index}-${className}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {className}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Checkbox
                  id={`mandatory-${index}`}
                  checked={item.isMandatory}
                  onCheckedChange={() => handleMandatoryToggle(index)}
                />
                <Label
                  htmlFor={`mandatory-${index}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  This is a mandatory fee
                </Label>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default FeeItemsTable;
