import React, { useState } from 'react';
import { Trash2, ChevronDown, Plus } from 'lucide-react';
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
  onAdd: () => void;
  categories: string[];
}

export function FeeItemsTable({
  items,
  onUpdate,
  onRemove,
  onAdd,
  categories,
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
    const parsed = amount === '' ? 0 : parseFloat(amount);
    onUpdate(index, { ...item, amount: isNaN(parsed) ? 0 : parsed });
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
                  ₦{(item.amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">
                  {item.isMandatory ? 'Mandatory' : 'Optional'}
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
                    value={item.amount === 0 ? '' : item.amount}
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

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAdd}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Another Item
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default FeeItemsTable;
