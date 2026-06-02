import React, { useState, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { InvoiceItem } from '../types';
import { formatCurrency } from '../lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

const NumberExpressionInput = ({ value, onChange, className, ...rest }: any) => {
  const [localValue, setLocalValue] = useState(String(value));
  useEffect(() => { setLocalValue(String(value)); }, [value]);
  
  const handleBlur = () => {
    try {
       if (/^[\d\.\+\-\*\/\s\(\)]+$/.test(localValue)) {
         const val = new Function('return (' + localValue + ')')();
         onChange(Number(val) || 0);
         setLocalValue(String(Number(val) || 0));
       } else {
         onChange(Number(localValue) || 0);
       }
    } catch(e) {
      onChange(Number(localValue) || 0);
    }
  }
  
  return (
    <input 
      value={localValue} 
      onChange={e => setLocalValue(e.target.value)} 
      onBlur={handleBlur} 
      className={className} 
      {...rest} 
    />
  );
};

interface SortableRowProps {
  item: InvoiceItem;
  index: number;
  currency: string;
  updateItem: (index: number, field: string, value: any) => void;
  removeItem: (index: number) => void;
  Input: any;
}

const SortableRow: React.FC<SortableRowProps> = ({ item, index, currency, updateItem, removeItem, Input }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-slate-50 group relative bg-white">
      <td className="py-2 pr-2 relative flex items-start pt-3">
        <div {...attributes} {...listeners} className="mt-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-slate-300 hover:text-slate-500 mr-1 touch-none">
          <GripVertical className="w-4 h-4" />
        </div>
        <button onClick={() => removeItem(index)} className="mt-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity print:hidden mr-2" title="Remove Item">
          <Trash2 className="w-4 h-4" />
        </button>
        <Input multiline value={item.description} onChange={(e: any) => updateItem(index, 'description', e.target.value)} placeholder="Item description" className="font-medium flex-1 text-sm" />
      </td>
      <td className="py-2 align-top pt-3 w-[15%]">
        <NumberExpressionInput value={item.quantity} onChange={(val: number) => updateItem(index, 'quantity', val)} className="bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-2 py-1 transition-colors w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 print:text-right print:shadow-none print:border-none print:p-0 text-right text-sm text-slate-600" />
      </td>
      <td className="py-2 align-top pt-3 w-[20%]">
        <NumberExpressionInput value={item.rate} onChange={(val: number) => updateItem(index, 'rate', val)} className="bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-2 py-1 transition-colors w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 print:text-right print:shadow-none print:border-none print:p-0 text-right text-sm text-slate-600" />
      </td>
      <td className="py-2 text-right font-semibold pr-2 align-top w-[20%] pt-4 text-sm">
        {formatCurrency(item.quantity * item.rate, currency)}
      </td>
    </tr>
  );
};

export const SortableInvoiceTable = ({ items, currency, updateItems, Input }: any) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex((i: any) => i.id === active.id);
      const newIndex = items.findIndex((i: any) => i.id === over.id);
      updateItems(arrayMove(items, oldIndex, newIndex));
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateItems(newItems);
  };

  const removeItem = (index: number) => {
    updateItems(items.filter((_: any, i: number) => i !== index));
  };

  const addItem = () => {
    updateItems([...items, { id: Math.random().toString(), description: 'New Item', quantity: 1, rate: 0 }]);
  };

  return (
    <div className="flex-1 w-full relative">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <table className="w-full text-left table-fixed">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</th>
              <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right w-[15%]">Qty</th>
              <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right w-[20%]">Rate</th>
              <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right w-[20%] pr-2">Amount</th>
            </tr>
          </thead>
          <SortableContext items={items.map((i: any) => i.id)} strategy={verticalListSortingStrategy}>
            <tbody className="text-sm">
              {items.map((item: any, index: number) => (
                <SortableRow key={item.id} item={item} index={index} currency={currency} updateItem={updateItem} removeItem={removeItem} Input={Input} />
              ))}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
      <button onClick={addItem} className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity print:hidden">
        + Add Line Item
      </button>
    </div>
  );
};
