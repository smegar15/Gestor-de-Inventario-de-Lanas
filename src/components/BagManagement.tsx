/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingBag, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Plus,
  Minus
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
  const [addingToBag, setAddingToBag] = useState<string | null>(null);
  const [addSelectedYarnId, setAddSelectedYarnId] = useState<string>('');
  const [addSelectedColorCode, setAddSelectedColorCode] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);

  const allColorsByYarn = useMemo(() => {
    const map = new Map<string, ColorStorage[]>();
    yarns.forEach((yarn) => {
      map.set(yarn.id, yarn.colors);
    });
    return map;
  }, [yarns]);

  const allBags = useMemo(() => {
    const bagMap = new Map<string, BagSummary>();

    yarns.forEach((yarn) => {
      yarn.colors.forEach((color) => {
        if (!color.bags) return;
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
      });
    });

    return Array.from(bagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [yarns]);
  
  const filteredBags = allBags.filter(bag => 
    bag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateBagQuantity = (yarnId: string, colorCode: string, bagName: string, delta: number) => {
    if (!bagName.trim() || delta === 0) return;

    const updatedYarns = yarns.map((yarn) => {
      if (yarn.id !== yarnId) return yarn;

      return {
        ...yarn,
        colors: yarn.colors.map((color) => {
          if (color.code !== colorCode) return color;

          const currentBags = color.bags ? [...color.bags] : [];
          const index = currentBags.findIndex((bag) => bag.name === bagName);
          const currentQty = index >= 0 ? currentBags[index].quantity : 0;
          const nextQty = Math.max(0, Number(currentQty) + delta);

          if (index >= 0) {
            if (nextQty === 0) {
              currentBags.splice(index, 1);
            } else {
              currentBags[index] = { ...currentBags[index], quantity: nextQty };
            }
          } else if (nextQty > 0) {
            currentBags.push({ name: bagName, quantity: nextQty });
          }

          return {
            ...color,
            bags: currentBags
          };
        })
      };
    });

    onUpdateYarns(updatedYarns);
  };

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

  const startAddToBag = (bagName: string) => {
    setAddingToBag(bagName);
    const firstYarn = yarns[0];
    if (firstYarn) {
      setAddSelectedYarnId(firstYarn.id);
      setAddSelectedColorCode(firstYarn.colors[0]?.code || '');
    } else {
      setAddSelectedYarnId('');
      setAddSelectedColorCode('');
    }
    setAddQuantity(1);
  };

  const handleAddSubmit = (bagName: string) => {
    if (!addSelectedYarnId || !addSelectedColorCode) return;
    updateBagQuantity(addSelectedYarnId, addSelectedColorCode, bagName, Math.max(1, Number(addQuantity) || 1));
    setAddQuantity(1);
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
                      type="button"
                      onClick={() => (addingToBag === bag.name ? setAddingToBag(null) : startAddToBag(bag.name))}
                      className="p-1.5 hover:bg-emerald-50 text-gray-400 hover:text-emerald-700 rounded-lg transition"
                      title="Añadir ovillos a esta bolsa"
                    >
                      <Plus size={14} />
                    </button>
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateBagQuantity(item.yarn.id, item.color.code, bag.name, -1)}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
                        title="Quitar 1"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-mono font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md min-w-[40px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateBagQuantity(item.yarn.id, item.color.code, bag.name, 1)}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100"
                        title="Añadir 1"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {addingToBag === bag.name && (
                <div className="p-4 border-t border-gray-100 bg-slate-50/40 space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    <select
                      value={addSelectedYarnId}
                      onChange={(e) => {
                        const nextYarnId = e.target.value;
                        setAddSelectedYarnId(nextYarnId);
                        const colors = allColorsByYarn.get(nextYarnId) || [];
                        setAddSelectedColorCode(colors[0]?.code || '');
                      }}
                      className="w-full bg-white border border-gray-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-gray-800 transition"
                    >
                      {yarns.map((yarn) => (
                        <option key={yarn.id} value={yarn.id}>
                          {yarn.brand} · {yarn.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={addSelectedColorCode}
                      onChange={(e) => setAddSelectedColorCode(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-gray-800 transition"
                    >
                      {(allColorsByYarn.get(addSelectedYarnId) || []).map((color) => (
                        <option key={color.code} value={color.code}>
                          {color.code} · {color.name}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-[1fr_120px] gap-2">
                      <input
                        type="number"
                        min="1"
                        value={addQuantity}
                        onChange={(e) => setAddQuantity(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full bg-white border border-gray-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-gray-800 transition font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSubmit(bag.name)}
                        className="w-full py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAddingToBag(null)}
                    className="w-full py-2 px-3 border border-gray-200 text-gray-500 hover:bg-white text-xs font-bold rounded-xl transition"
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
