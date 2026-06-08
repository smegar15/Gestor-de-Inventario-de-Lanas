/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { RemainingPercent, StartedSkein, Yarn } from '../types';

interface StartedSkeinsManagementProps {
  yarns: Yarn[];
  startedSkeins: StartedSkein[];
  onUpdateStartedSkeins: (next: StartedSkein[]) => void;
}

const REMAINING_OPTIONS: RemainingPercent[] = [100, 75, 50, 25];

function toRemainingPercent(value: unknown): RemainingPercent {
  const n = Number(value);
  if (n === 100 || n === 75 || n === 50 || n === 25) return n;
  return 100;
}

export default function StartedSkeinsManagement({ yarns, startedSkeins, onUpdateStartedSkeins }: StartedSkeinsManagementProps) {
  const [selectedYarnId, setSelectedYarnId] = useState<string>('');
  const [selectedColorCode, setSelectedColorCode] = useState<string>('');
  const [remainingPercent, setRemainingPercent] = useState<RemainingPercent>(100);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedYarn = useMemo(() => yarns.find((y) => y.id === selectedYarnId) || null, [yarns, selectedYarnId]);
  const selectedColor = useMemo(
    () => selectedYarn?.colors.find((c) => c.code === selectedColorCode) || null,
    [selectedYarn, selectedColorCode]
  );

  const yarnOptions = useMemo(() => {
    return [...yarns].sort((a, b) => {
      const left = `${a.brand} ${a.name}`.trim();
      const right = `${b.brand} ${b.name}`.trim();
      return left.localeCompare(right, 'es-ES');
    });
  }, [yarns]);

  const filteredStarted = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = [...startedSkeins].sort((a, b) => {
      const atA = Date.parse(a.updatedAt || a.createdAt || '') || 0;
      const atB = Date.parse(b.updatedAt || b.createdAt || '') || 0;
      return atB - atA;
    });
    if (!term) return list;

    return list.filter((s) => {
      const haystack = [
        s.yarnBrand,
        s.yarnName,
        s.colorCode,
        s.colorName,
        s.sku,
        String(s.remainingPercent),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [startedSkeins, searchTerm]);

  const handleAdd = () => {
    if (!selectedYarn || !selectedColor) {
      alert('Selecciona una lana y un color.');
      return;
    }

    const now = new Date().toISOString();
    const item: StartedSkein = {
      id: `started-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      yarnId: selectedYarn.id,
      yarnName: selectedYarn.name,
      yarnBrand: selectedYarn.brand,
      colorCode: selectedColor.code,
      colorName: selectedColor.name,
      colorHex: selectedColor.hex,
      sku: selectedColor.sku,
      remainingPercent,
      createdAt: now,
      updatedAt: now,
    };

    onUpdateStartedSkeins([item, ...startedSkeins]);
    setSelectedColorCode('');
    setRemainingPercent(100);
  };

  const updateRemaining = (id: string, nextValue: RemainingPercent) => {
    const now = new Date().toISOString();
    const next = startedSkeins.map((s) => (s.id === id ? { ...s, remainingPercent: nextValue, updatedAt: now } : s));
    onUpdateStartedSkeins(next);
  };

  const deleteItem = (id: string) => {
    if (!confirm('¿Eliminar este ovillo empezado?')) return;
    onUpdateStartedSkeins(startedSkeins.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Ovillos empezados</h2>
        <p className="text-xs text-gray-500 font-medium">
          Registra ovillos que ya has empezado y marca el porcentaje aproximado que te queda (100, 75, 50, 25).
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-gray-800 truncate">Añadir ovillo empezado</h3>
            <p className="text-[11px] text-gray-400">Elige la lana, el color y el porcentaje que te queda.</p>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Lana</label>
            <select
              value={selectedYarnId}
              onChange={(e) => {
                setSelectedYarnId(e.target.value);
                setSelectedColorCode('');
              }}
              className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2.5 px-3 text-xs text-gray-800 transition"
            >
              <option value="">Selecciona una lana…</option>
              {yarnOptions.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.brand} · {y.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Color</label>
            <select
              value={selectedColorCode}
              onChange={(e) => setSelectedColorCode(e.target.value)}
              disabled={!selectedYarn}
              className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2.5 px-3 text-xs text-gray-800 transition disabled:opacity-60"
            >
              <option value="">{selectedYarn ? 'Selecciona un color…' : 'Elige una lana primero'}</option>
              {(selectedYarn?.colors || [])
                .slice()
                .sort((a, b) => a.code.localeCompare(b.code, 'es-ES', { numeric: true }))
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Me queda</label>
            <div className="flex items-center gap-2">
              <select
                value={remainingPercent}
                onChange={(e) => setRemainingPercent(toRemainingPercent(e.target.value))}
                className="flex-1 bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2.5 px-3 text-xs text-gray-800 transition"
              >
                {REMAINING_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}%
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer shrink-0"
              >
                <Plus size={14} /> Añadir
              </button>
            </div>
          </div>
        </div>

        {selectedYarn && selectedColor && (
          <div className="px-5 pb-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 flex items-center gap-3">
              <span className="w-9 h-9 rounded-full border border-gray-200 shadow-inner shrink-0" style={{ backgroundColor: selectedColor.hex }} />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
                  {selectedYarn.brand} · {selectedYarn.name}
                </span>
                <div className="text-xs font-bold text-gray-800 truncate">
                  {selectedColor.code} · {selectedColor.name} · {remainingPercent}%
                </div>
                <div className="text-[10px] text-gray-400 font-mono truncate">SKU: {selectedColor.sku}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-gray-800">Listado</h3>
            <p className="text-[11px] text-gray-400">{startedSkeins.length} {startedSkeins.length === 1 ? 'ovillo' : 'ovillos'} empezados</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar (lana, color, SKU, %)..."
              className="w-full bg-white border border-gray-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 pl-9 pr-3 text-xs text-gray-800 transition"
            />
          </div>
        </div>

        {filteredStarted.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-xs font-semibold text-gray-700">Todavía no has añadido ovillos empezados</p>
            <p className="text-[11px] mt-1">Usa el formulario de arriba para registrar el primero.</p>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredStarted.map((s) => (
              <motion.div
                key={s.id}
                layout
                className="p-4 rounded-2xl border border-gray-100 bg-slate-50/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-10 h-10 rounded-full border border-gray-200 shadow-inner shrink-0"
                    style={{ backgroundColor: s.colorHex || '#e2e8f0' }}
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
                      {s.yarnBrand} · {s.yarnName}
                    </span>
                    <div className="text-xs font-bold text-gray-800 truncate">
                      <span className="font-mono">{s.colorCode}</span> · {s.colorName}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono truncate">SKU: {s.sku}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={s.remainingPercent}
                    onChange={(e) => updateRemaining(s.id, toRemainingPercent(e.target.value))}
                    className="bg-white border border-gray-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-2.5 text-xs text-gray-800 transition"
                    title="Porcentaje restante"
                  >
                    {REMAINING_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}%
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => deleteItem(s.id)}
                    className="p-2 hover:bg-rose-50 text-gray-400 hover:text-rose-700 rounded-xl transition"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

