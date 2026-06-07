/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Package, 
  Layers, 
  ShoppingBag,
  Search,
  ArrowRight,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import { Yarn } from '../types';
import { getBagNames, getColorTotalStock } from '../utils/inventory';

interface DashboardProps {
  yarns: Yarn[];
  onNavigate: () => void;
}

export default function Dashboard({ yarns, onNavigate }: DashboardProps) {
  const totalYarnModels = yarns.length;
  const totalColors = yarns.reduce((sum, yarn) => sum + yarn.colors.length, 0);
  const bagNames = new Set<string>();
  const lowStockAllocations: { yarn: Yarn; color: Yarn['colors'][0] }[] = [];

  yarns.forEach((yarn) => {
    yarn.colors.forEach((color) => {
      getBagNames(color).forEach((bagName) => bagNames.add(bagName));
      if (getColorTotalStock(color) < color.minStock) {
        lowStockAllocations.push({ yarn, color });
      }
    });
  });

  const inventoryRows = yarns.flatMap((yarn) =>
    yarn.colors.map((color) => ({
      id: `${yarn.id}-${color.code}`,
      yarn,
      color,
      stock: getColorTotalStock(color),
      bags: getBagNames(color),
    }))
  );

  const sortedInventory = inventoryRows.sort((a, b) => {
    if (a.stock !== b.stock) {
      return b.stock - a.stock;
    }

    return a.yarn.name.localeCompare(b.yarn.name);
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-600 to-amber-500 rounded-3xl p-6 text-white shadow-lg overflow-hidden relative">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 transform scale-150 rotate-12 pointer-events-none">
          🧶
        </div>
        <div className="md:max-w-xl">
          <span className="bg-orange-700/50 text-orange-100 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Inventario personal
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-3">
            Tus lanas, colores y bolsas en una sola vista
          </h2>
          <p className="text-orange-100/90 text-sm mt-2 leading-relaxed">
            Tienes <span className="font-bold">{totalYarnModels} modelos</span>, <span className="font-bold">{totalColors} colores</span> y <span className="font-bold">{bagNames.size} bolsas</span> registradas. Lo importante ahora es ver rápido lo que tienes y dónde está.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100/30 flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Modelos</span>
            <span className="text-2xl font-bold text-gray-800 tracking-tight">{totalYarnModels}</span>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <Layers size={24} />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100/30 flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Colores</span>
            <span className="text-2xl font-bold text-gray-800 tracking-tight">{totalColors}</span>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <Package size={24} />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100/30 flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Bolsas</span>
            <span className="text-2xl font-bold text-gray-800 tracking-tight">{bagNames.size}</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ShoppingBag size={24} />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className={`p-5 rounded-2xl shadow-sm flex items-center justify-between border ${
            lowStockAllocations.length > 0 
              ? 'bg-rose-50/50 border-rose-100' 
              : 'bg-white border-orange-100/30'
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">Alertas Stock Bajo</span>
            <span className={`text-2xl font-bold tracking-tight ${
              lowStockAllocations.length > 0 ? 'text-rose-600' : 'text-gray-800'
            }`}>
              {lowStockAllocations.length}
            </span>
          </div>
          <div className={`p-3 rounded-xl ${
            lowStockAllocations.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-gray-50 text-gray-400'
          }`}>
            <AlertTriangle size={24} />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <Search size={16} /> Vista rápida
                </h3>
                <p className="text-sm text-gray-500">
                  Esta pantalla resume todo tu stock actual. Para editar bolsas, colores o añadir nuevas marcas, entra en el catálogo.
                </p>
              </div>
              <button
                id="btn-nav-catalog"
                onClick={onNavigate}
                className="shrink-0 inline-flex items-center gap-1.5 py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Abrir catálogo <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                ⚠️ Colores con poco stock ({lowStockAllocations.length})
              </h3>
              {lowStockAllocations.length > 0 && (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md">
                  REVISAR
                </span>
              )}
            </div>

            {lowStockAllocations.length === 0 ? (
              <div className="text-center py-8 text-gray-400 space-y-2">
                <p className="text-sm font-semibold text-gray-600">Todo en orden</p>
                <p className="text-xs">No hay colores por debajo del mínimo que has marcado.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {lowStockAllocations.map(({ yarn, color }) => (
                  <div 
                    key={color.sku} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-amber-50/40 rounded-xl border border-amber-100 hover:bg-amber-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      {/* Color Dot Visual */}
                      <span 
                        className="w-8 h-8 rounded-full border border-gray-200 shadow-inner flex items-center justify-center text-xs font-bold text-white shrink-0" 
                        style={{ 
                          backgroundColor: color.hex,
                          textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                        }}
                      >
                        {color.code}
                      </span>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-sm text-gray-800">{yarn.name}</span>
                          <span className="text-[10px] bg-white border px-1.5 py-0.2 text-gray-500 rounded">{yarn.brand}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex flex-wrap gap-x-2 items-center mt-0.5">
                          <span>Color {color.code} - {color.name}</span>
                          {getBagNames(color).length > 0 && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="font-mono text-[10px] tracking-wider text-gray-500 flex items-center gap-1">
                                <MapPin size={10} /> {getBagNames(color).join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 sm:mt-0 flex items-center gap-4 text-right">
                      <div>
                        <span className="text-xs text-gray-500 block">Stock Actual</span>
                        <span className="text-sm font-bold text-rose-600 font-mono">{getColorTotalStock(color)} ovillos</span>
                      </div>
                      <div className="border-l pl-4 border-gray-200">
                        <span className="text-xs text-gray-400 block">Stock Mínimo</span>
                        <span className="text-sm font-semibold text-gray-700 font-mono">{color.minStock} ovillos</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              📦 Inventario por color
            </h3>
            <div className="space-y-4">
              {sortedInventory.slice(0, 8).map((item) => (
                <div key={item.id} className="p-3 rounded-xl border border-gray-100 bg-slate-50/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full border border-gray-200 shrink-0"
                          style={{ backgroundColor: item.color.hex }}
                        />
                        <span className="font-semibold text-gray-700 truncate">{item.yarn.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.color.name} · #{item.color.code}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        {item.bags.length > 0 ? item.bags.join(' · ') : 'Sin bolsas asignadas'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-bold text-gray-800 font-mono">{item.stock}</span>
                      <span className="block text-[10px] text-gray-400">ovillos</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-800 mb-4">
              👜 Tus bolsas
            </h3>
            {bagNames.size === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400">
                Aún no has asignado bolsas a ningún color.
              </div>
            ) : (
              <div className="space-y-3.5">
                {[...bagNames].sort().map((bagName) => {
                  const bagTotal = inventoryRows.reduce((sum, item) => {
                    const bag = item.color.bags?.find((currentBag) => currentBag.name === bagName);
                    return sum + (bag?.quantity || 0);
                  }, 0);

                  return (
                    <div key={bagName} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <span className="font-bold text-sm text-gray-800">{bagName}</span>
                        <span className="block text-[11px] text-gray-400">Bolsa registrada en tu inventario</span>
                      </div>
                      <span className="font-mono text-sm font-bold text-orange-600">{bagTotal} ovillos</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-gray-100 text-center">
              <button
                id="btn-nav-catalog-bottom"
                onClick={onNavigate}
                className="text-orange-600 hover:text-orange-700 text-xs font-semibold cursor-pointer"
              >
                Gestionar bolsas y colores →
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
