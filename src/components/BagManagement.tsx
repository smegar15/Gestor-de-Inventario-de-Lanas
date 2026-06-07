/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  ChevronRight,
  Package
} from 'lucide-react';
import { Yarn, ColorStorage } from '../types';

interface BagManagementProps {
  yarns: Yarn[];
  onUpdateYarns: (yarns: Yarn[]) => void;
}

interface BagSummary {
  name: string;
  totalItems: number;
  items: {
    yarn: Yarn;
    color: ColorStorage;
    quantity: number;
  }[];
}

export default function BagManagement({ yarns, onUpdateYarns }: BagManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBagName, setEditingBagName] = useState<string | null>(null);
  const [newBagName, setNewBagName] = useState('');

  // Aggregate all bags
  const bagMap = new Map<string, BagSummary>();

  yarns.forEach((yarn) => {
    yarn.colors.forEach((color) => {
      if (color.bags) {
        color.bags.forEach((bag) => {
          if (!bag.name.trim()) return;
          
          const existing = bagMap.get(bag.name) || {
            name: bag.name,
            totalItems: 0,
            items: []
          };

          existing.totalItems += bag.quantity;
          existing.items.push({
            yarn,
            color,
            quantity: bag.quantity
          });

          bagMap.set(bag.name, existing);
        });
      }
    });
  });

  const allBags = Array.from(bagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  const filteredBags = allBags.filter(bag => 
    bag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRenameBag = (oldName: string) => {
    if (!newBagName.trim() || newBagName === oldName) {
      setEditingBagName(null);
      return;
    }

    const updatedYarns = yarns.map(yarn => ({
      ...yarn,
      colors: yarn.colors.map(color => ({
        ...color,
        bags: color.bags?.map(bag => 
          bag.name === oldName ? { ...bag, name: newBagName.trim() } : bag
        )
      }))
    }));

    onUpdateYarns(updatedYarns);
    setEditingBagName(null);
    setNewBagName('');
  };

  const handleDeleteBag = (bagName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la bolsa "${bagName}"? Los ovillos se quedarán sin bolsa asignada.`)) {
      return;
    }

    const updatedYarns = yarns.map(yarn => ({
      ...yarn,
      colors: yarn.colors.map(color => ({
        ...color,
        bags: color.bags?.filter(bag => bag.name !== bagName)
      }))
    }));

    onUpdateYarns(updatedYarns);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Gestión de Bolsas</h2>
          <p className="text-xs text-gray-500 font-medium">Organiza tus bolsas, cámbiales el nombre o mira qué hay dentro de cada una.</p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar bolsa..."
            className="w-full bg-white border border-gray-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 pl-9 pr-4 text-sm text-gray-800 transition"
          />
        </div>
      </div>

      {filteredBags.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center space-y-3">
          <ShoppingBag size={48} className="text-gray-300 stroke-1" />
          <h3 className="font-bold text-gray-700 text-sm">No hay bolsas registradas</h3>
          <p className="text-xs text-gray-400 max-w-sm">
            Las bolsas aparecen automáticamente cuando las asignas a tus colores en el Catálogo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBags.map((bag) => (
            <motion.div
              key={bag.name}
              layout
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-gray-50 bg-slate-50/50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    {editingBagName === bag.name ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={newBagName}
                          onChange={(e) => setNewBagName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameBag(bag.name)}
                          className="w-full bg-white border border-orange-500 focus:outline-none rounded-lg px-2 py-1 text-sm font-bold text-gray-800"
                        />
                        <button 
                          onClick={() => handleRenameBag(bag.name)}
                          className="p-1 bg-green-50 text-green-600 rounded-md hover:bg-green-100"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => setEditingBagName(null)}
                          className="p-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <h3 className="font-bold text-gray-800 truncate flex items-center gap-2">
                        <ShoppingBag size={16} className="text-orange-600 shrink-0" />
                        {bag.name}
                      </h3>
                    )}
                  </div>
                  
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingBagName(bag.name);
                        setNewBagName(bag.name);
                      }}
                      className="p-1.5 hover:bg-white text-gray-400 hover:text-gray-700 rounded-lg transition"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteBag(bag.name)}
                      className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-bold text-gray-700">{bag.totalItems} ovillos</span>
                  <span>·</span>
                  <span>{bag.items.length} variaciones</span>
                </div>
              </div>

              <div className="p-4 flex-1 overflow-y-auto max-h-64 space-y-3">
                {bag.items.map((item, idx) => (
                  <div key={`${item.yarn.id}-${item.color.code}-${idx}`} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span 
                        className="w-3 h-3 rounded-full border border-gray-200 shrink-0"
                        style={{ backgroundColor: item.color.hex }}
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-gray-700 truncate block">{item.yarn.name}</span>
                        <span className="text-gray-400 truncate block">{item.color.name} #{item.color.code}</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md">
                      {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
