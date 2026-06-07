/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Sliders, 
  PlusCircle, 
  Search, 
  Download, 
  Calendar,
  Layers,
  MapPin,
  FileSpreadsheet,
  Trash2,
  Lock,
  Plus,
  Minus,
  AlertCircle
} from 'lucide-react';
import { Yarn, ColorStorage, Movement, MovementType } from '../types';

interface StockOperationsProps {
  yarns: Yarn[];
  movements: Movement[];
  onRegisterMovement: (movement: Omit<Movement, 'id' | 'date'>) => void;
  currentUser: { username: string; name: string; role: string };
  initialForceType?: 'ENTRADA' | 'SALIDA' | null;
  onClearForceType?: () => void;
}

export default function StockOperations({
  yarns,
  movements,
  onRegisterMovement,
  currentUser,
  initialForceType,
  onClearForceType
}: StockOperationsProps) {
  // Navigation
  const [activeSubTab, setActiveSubTab] = useState<'REGISTER' | 'HISTORY'>('REGISTER');

  // Form states
  const [selectedYarnId, setSelectedYarnId] = useState('');
  const [selectedColorCode, setSelectedColorCode] = useState('');
  const [movType, setMovType] = useState<MovementType>('ENTRADA');
  const [quantity, setQuantity] = useState<number>(5);
  const [reason, setReason] = useState('Compra de Reposición');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // History filters
  const [histSearch, setHistSearch] = useState('');
  const [histTypeFilter, setHistTypeFilter] = useState<'ALL' | MovementType>('ALL');

  // Handle triggered quick-actions from dashboard
  useEffect(() => {
    if (initialForceType) {
      setMovType(initialForceType);
      setActiveSubTab('REGISTER');
      
      // Auto-set standard reason depending on type
      if (initialForceType === 'ENTRADA') {
        setReason('Compra de Reposición');
      } else {
        setReason('Venta de Mostrador');
      }

      if (onClearForceType) {
        onClearForceType();
      }
    }
  }, [initialForceType]);

  const selectedYarn = yarns.find((y) => y.id === selectedYarnId);
  const selectedColor = selectedYarn?.colors.find((c) => c.code === selectedColorCode);

  // Dynamic reasons list depending on type
  const reasonsForEntries = ['Compra de Reposición', 'Devolución de Cliente', 'Muestra de Proveedor', 'Regalo / Promoción'];
  const reasonsForExits = ['Venta de Mostrador', 'Venta Online', 'Muestra a Diseñadora', 'Lana Defectuosa / Sucia', 'Pérdida / Extravío'];
  const reasonsForAdjustments = ['Corrección de Inventario Físico', 'Ajuste de Auditoría Anual', 'Error de Entrada Anterior'];

  const getReasons = () => {
    if (movType === 'ENTRADA') return reasonsForEntries;
    if (movType === 'SALIDA') return reasonsForExits;
    return reasonsForAdjustments;
  };

  // Set default reason when type changes
  useEffect(() => {
    const reasons = getReasons();
    if (!reasons.includes(reason)) {
      setReason(reasons[0]);
    }
  }, [movType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedYarnId || !selectedColorCode) {
      setErrorMsg('Por favor select una lana y un color del catálogo.');
      return;
    }

    if (quantity <= 0) {
      setErrorMsg('La cantidad de movimiento debe ser un número positivo mayor que cero.');
      return;
    }

    if (!selectedColor) {
      setErrorMsg('El color seleccionado no coincide con nuestro catálogo.');
      return;
    }

    // Safety checks for exits (guarding negative stock unless admin forces it)
    let computedQty = quantity;
    if (movType === 'SALIDA') {
      computedQty = quantity; // We store absolute value in quantity, function inside parent handles math
      if (selectedColor.stock < quantity) {
        if (currentUser.role !== 'admin') {
          setErrorMsg(`Acceso denegado: El stock actual de este color es ${selectedColor.stock} y estás intentando vender/retirar ${quantity}. Solo un Administrador puede forzar stock negativo.`);
          return;
        }
      }
    } else if (movType === 'AJUSTE') {
      // It can be positive or negative
      // We will present it elegantly
    }

    onRegisterMovement({
      yarnId: selectedYarn.id,
      yarnName: selectedYarn.name,
      yarnBrand: selectedYarn.brand,
      colorCode: selectedColor.code,
      colorName: selectedColor.name,
      sku: selectedColor.sku,
      type: movType,
      quantity: movType === 'SALIDA' ? -quantity : quantity, // positive for entry, negative for output
      reason: reason,
      user: currentUser.name,
      notes: notes.trim() || undefined
    });

    setSuccessMsg('Movimiento de almacén registrado con éxito.');
    setNotes('');
    setQuantity(5);
    // Keep yarn selected, reset color choice for successive loads of same invoice
    setSelectedColorCode('');

    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  // Calculate simulated future stock preview
  const getSimulatedStock = () => {
    if (!selectedColor) return 0;
    if (movType === 'ENTRADA') return selectedColor.stock + quantity;
    if (movType === 'SALIDA') return selectedColor.stock - quantity;
    return selectedColor.stock + quantity; // adjustments can be configured directly in screen
  };

  // Advanced Filtered movements
  const filteredMovements = movements.filter((m) => {
    const matchesSearch = m.yarnName.toLowerCase().includes(histSearch.toLowerCase()) ||
                          m.colorCode.includes(histSearch) ||
                          m.reason.toLowerCase().includes(histSearch.toLowerCase()) ||
                          m.sku.toLowerCase().includes(histSearch.toLowerCase());
    
    const matchesType = histTypeFilter === 'ALL' || m.type === histTypeFilter;
    return matchesSearch && matchesType;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredMovements.length === 0) {
      alert('No hay movimientos que exportar en la lista actual.');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Fecha,Lana,Marca,Color,SKU,Operación,Cantidad,Motivo,Operador,Notas\r\n";

    filteredMovements.forEach((m) => {
      const row = [
        m.id,
        new Date(m.date).toLocaleString('es-ES'),
        m.yarnName,
        m.yarnBrand,
        `Col ${m.colorCode} - ${m.colorName}`,
        m.sku,
        m.type,
        m.quantity,
        m.reason,
        m.user,
        m.notes || ''
      ].map(val => `"${val.toString().replace(/"/g, '""')}"`).join(",");
      
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Movimientos_Stock_Lanas_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Sub Tabs control */}
      <div className="flex border-b border-gray-100 pb-0.5 justify-between items-center bg-white px-6 py-2 rounded-2xl shadow-sm">
        <div className="flex gap-4">
          <button
            id="subtab-register"
            type="button"
            onClick={() => setActiveSubTab('REGISTER')}
            className={`pb-2.5 font-bold text-sm transition relative cursor-pointer ${
              activeSubTab === 'REGISTER' ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Registrar Operación Stock
            {activeSubTab === 'REGISTER' && (
              <motion.div layoutId="subTabBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
            )}
          </button>
          
          <button
            id="subtab-history"
            type="button"
            onClick={() => setActiveSubTab('HISTORY')}
            className={`pb-2.5 font-bold text-sm transition relative cursor-pointer ${
              activeSubTab === 'HISTORY' ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Historial de Movimientos ({filteredMovements.length})
            {activeSubTab === 'HISTORY' && (
              <motion.div layoutId="subTabBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
            )}
          </button>
        </div>

        <span className="text-[10px] bg-slate-100 text-gray-500 py-1 px-2.5 rounded-md font-semibold font-mono">
          Operador: {currentUser.name}
        </span>
      </div>

      <AnimatePresence mode="wait">
        
        {/* VIEW 1: Document action form */}
        {activeSubTab === 'REGISTER' && (
          <motion.div
            key="ops-register-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Form Column - 7 cols */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
              <div>
                <h3 className="font-bold text-base text-gray-850">Registrar Entrada o Salida de Mercadería</h3>
                <p className="text-xs text-gray-400 mt-1">Ingresa compras, ventas o correcciones por conteos de inventario físico.</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-100">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-green-50 text-green-700 text-xs rounded-xl flex items-center gap-2 border border-green-150">
                  <span className="font-bold">✓ {successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Operation Type selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Tipo de Movimiento
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      id="opt-entry"
                      type="button"
                      onClick={() => setMovType('ENTRADA')}
                      className={`p-3 text-xs font-bold rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                        movType === 'ENTRADA'
                          ? 'bg-green-50/50 border-green-500 text-green-700'
                          : 'bg-white border-gray-150 text-gray-500 hover:bg-slate-50'
                      }`}
                    >
                      <PlusCircle size={18} />
                      <span>Entrada (+)</span>
                    </button>

                    <button
                      id="opt-exit"
                      type="button"
                      onClick={() => setMovType('SALIDA')}
                      className={`p-3 text-xs font-bold rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                        movType === 'SALIDA'
                          ? 'bg-orange-50/50 border-orange-500 text-orange-700'
                          : 'bg-white border-gray-150 text-gray-500 hover:bg-slate-50'
                      }`}
                    >
                      <Minus size={18} />
                      <span>Salida (-)</span>
                    </button>

                    <button
                      id="opt-adj"
                      type="button"
                      onClick={() => setMovType('AJUSTE')}
                      className={`p-3 text-xs font-bold rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                        movType === 'AJUSTE'
                          ? 'bg-sky-50/50 border-sky-500 text-sky-700'
                          : 'bg-white border-gray-150 text-gray-500 hover:bg-slate-50'
                      }`}
                    >
                      <Sliders size={18} />
                      <span>Ajuste (Conteo)</span>
                    </button>
                  </div>
                </div>

                {/* 2. Choose Yarn */}
                <div>
                  <label htmlFor="select-yarn" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Seleccionar Lana *
                  </label>
                  <select
                    id="select-yarn"
                    value={selectedYarnId}
                    onChange={(e) => {
                      setSelectedYarnId(e.target.value);
                      setSelectedColorCode('');
                    }}
                    className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 rounded-xl py-2.5 px-3 text-xs text-gray-700"
                    required
                  >
                    <option value="">-- Seleccionar Lana del catálogo --</option>
                    {yarns.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name} ({y.brand}) - {y.composition} [Precio: {y.price.toFixed(2)}€]
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Choose Color (Visual swatches!) */}
                {selectedYarn && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Seleccionar Variante de Color *
                    </label>

                    {selectedYarn.colors.length === 0 ? (
                      <div className="p-3 text-xs text-red-500 bg-red-50 border rounded-xl">
                        Este modelo no tiene colores registrados. Añade colores en "Catálogo" antes de operar.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[180px] overflow-y-auto p-1 bg-slate-50 rounded-xl border">
                        {selectedYarn.colors.map((color) => {
                          const isColorSelected = selectedColorCode === color.code;
                          const isLow = color.stock < color.minStock;

                          return (
                            <button
                              key={color.code}
                              type="button"
                              onClick={() => setSelectedColorCode(color.code)}
                              className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition relative cursor-pointer ${
                                isColorSelected 
                                  ? 'bg-white border-orange-500 shadow-sm ring-1 ring-orange-500/35' 
                                  : 'bg-white border-gray-150 hover:border-gray-200'
                              }`}
                            >
                              <span 
                                className="w-5.5 h-5.5 rounded-full border border-gray-200 shadow-inner flex items-center justify-center shrink-0 text-[9px] font-bold text-white"
                                style={{ 
                                  backgroundColor: color.hex,
                                  textShadow: '0 0.8px 1.5px rgba(0,0,0,0.6)'
                                }}
                              >
                                {color.code}
                              </span>
                              <div className="min-w-0">
                                <span className="block font-bold text-[10.5px] text-gray-700 truncate">{color.name}</span>
                                <span className={`text-[9.5px] font-mono ${isLow ? 'text-rose-600 font-bold' : 'text-gray-400'}`}>
                                  Stock: {color.stock}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Controls: Quantity, Reason & Notes */}
                {selectedColor && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="mov-qty" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Cantidad (unidades / ovillos) *
                      </label>
                      <input
                        id="mov-qty"
                        type="number"
                        min="1"
                        value={quantity || ''}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none rounded-xl py-2 px-3 text-xs text-gray-850 font-bold font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="mov-reason" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Motivo / Justificación
                      </label>
                      <select
                        id="mov-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none rounded-xl py-2 px-2 text-xs text-gray-750"
                        required
                      >
                        {getReasons().map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {selectedColor && (
                  <div>
                    <label htmlFor="mov-notes" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Comentarios de lote o albarán
                    </label>
                    <input
                      id="mov-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej. Albarán #X90, número de lote 158a..."
                      className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none rounded-xl py-2.5 px-3 text-xs text-gray-800"
                    />
                  </div>
                )}

                {selectedColor && (
                  <button
                    id="btn-register-mov"
                    type="submit"
                    className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition shadow-sm mt-3 cursor-pointer flex justify-center items-center gap-1"
                  >
                    Procesar {movType === 'ENTRADA' ? 'Entrada' : movType === 'SALIDA' ? 'Salida/Ventas' : 'Ajustar Inventario'}
                  </button>
                )}
              </form>
            </div>

            {/* Simulated Live Preview Column - 5 cols */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-850 to-slate-900 p-6 rounded-3xl text-white flex flex-col justify-between min-h-[300px]">
              <div>
                <span className="text-[10px] bg-slate-800 tracking-widest text-slate-400 uppercase font-bold py-1 px-2 rounded-md">
                  Previsualización de Almacén
                </span>

                {!selectedColor ? (
                  <div className="text-center py-16 space-y-3">
                    <span className="text-4xl text-slate-650 block">📦</span>
                    <p className="text-xs font-bold text-slate-300">Esperando selección...</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Selecciona una lana y un color de catálogo para ver la proyección del stock en tiempo real antes de guardar los movimientos.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-5">
                    <div>
                      <span className="text-slate-400 text-xs block font-bold">{selectedYarn?.brand}</span>
                      <h4 className="text-xl font-bold">{selectedYarn?.name}</h4>
                      <p className="text-[11px] text-slate-400">{selectedYarn?.composition}</p>
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-xl space-y-2 border border-slate-800">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Variante de color:</span>
                        <span className="font-bold">Col {selectedColor.code} - {selectedColor.name}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">SKU de Producto:</span>
                        <span className="font-mono bg-slate-800 px-1 py-0.2 rounded text-[10px] tracking-wider">{selectedColor.sku}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Ubicación Física:</span>
                        <span className="font-semibold text-amber-400 flex items-center gap-0.5">
                          <MapPin size={10} /> {selectedColor.location}
                        </span>
                      </div>
                    </div>

                    {/* Stock Projections comparison */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-slate-850 p-3 rounded-xl text-center border border-slate-75 *">
                        <span className="text-[10px] text-slate-400 block uppercase">Stock Anterior</span>
                        <span className="text-xl font-extrabold text-slate-300 font-mono mt-1 block">
                          {selectedColor.stock} uds.
                        </span>
                      </div>
                      <div className="bg-white/10 p-3 rounded-xl text-center border border-white/10 relative">
                        <span className="text-[10px] text-orange-200 block uppercase">Nuevo Proyectado</span>
                        <span className="text-xl font-extrabold text-orange-400 font-mono mt-1 block">
                          {getSimulatedStock()} uds.
                        </span>
                        
                        {/* Direction Arrow icon indicating action direction */}
                        <div className="absolute -top-1.5 -right-1.5 p-1 rounded-full text-white bg-slate-900 border text-[9px] shadow-sm">
                          {movType === 'ENTRADA' ? (
                            <ArrowUpRight size={10} className="text-green-400" />
                          ) : (
                            <ArrowDownRight size={10} className="text-orange-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedColor && (
                <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex gap-2 items-center">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 animate-pulse" />
                  <span>Cálculos proyectados sobre coste unitario de <strong>{selectedYarn?.price.toFixed(2)}€</strong></span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW 2: Datatable history log with rich downloads */}
        {activeSubTab === 'HISTORY' && (
          <motion.div
            key="ops-history-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4"
          >
            {/* Table Filters panel */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex gap-2 flex-wrap text-xs w-full md:w-auto">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    id="search-history"
                    type="text"
                    value={histSearch}
                    onChange={(e) => setHistSearch(e.target.value)}
                    placeholder="Filtrar por SKU, lana..."
                    className="bg-slate-50 border focus:bg-white focus:outline-none rounded-lg py-1.5 pl-8 pr-3 text-xs w-[170px]"
                  />
                </div>

                {/* Filter pill tabs */}
                <button
                  id="hist-filter-all"
                  onClick={() => setHistTypeFilter('ALL')}
                  className={`py-1.5 px-3 rounded-lg border font-semibold transition ${
                    histTypeFilter === 'ALL' 
                      ? 'bg-slate-800 border-slate-800 text-white' 
                      : 'bg-white text-gray-500 hover:bg-slate-50'
                  }`}
                >
                  Todos
                </button>
                <button
                  id="hist-filter-entry"
                  onClick={() => setHistTypeFilter('ENTRADA')}
                  className={`py-1.5 px-3 rounded-lg border font-semibold transition ${
                    histTypeFilter === 'ENTRADA' 
                      ? 'bg-green-50 border-green-500 text-green-700' 
                      : 'bg-white text-gray-500 hover:bg-slate-50'
                  }`}
                >
                  Entradas
                </button>
                <button
                  id="hist-filter-exit"
                  onClick={() => setHistTypeFilter('SALIDA')}
                  className={`py-1.5 px-3 rounded-lg border font-semibold transition ${
                    histTypeFilter === 'SALIDA' 
                      ? 'bg-orange-50 border-orange-500 text-orange-700' 
                      : 'bg-white text-gray-500 hover:bg-slate-50'
                  }`}
                >
                  Salidas
                </button>
                <button
                  id="hist-filter-adj"
                  onClick={() => setHistTypeFilter('AJUSTE')}
                  className={`py-1.5 px-3 rounded-lg border font-semibold transition ${
                    histTypeFilter === 'AJUSTE' 
                      ? 'bg-sky-50 border-sky-500 text-sky-700' 
                      : 'bg-white text-gray-500 hover:bg-slate-50'
                  }`}
                >
                  Ajustes
                </button>
              </div>

              {/* CSV download button */}
              <button
                id="btn-export-moves"
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-150 text-emerald-700 text-xs font-bold rounded-xl transition cursor-pointer self-stretch md:self-auto justify-center"
              >
                <Download size={14} /> Exportar Excel / CSV
              </button>
            </div>

            {/* movements Table */}
            <div className="overflow-x-auto border border-gray-100 rounded-2xl">
              <table id="table-movements-history" className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 text-[10px]">
                    <th className="p-3.5 pl-4">Fecha / Hora</th>
                    <th className="p-3.5">Lana de Tejer</th>
                    <th className="p-3.5">Color / Código</th>
                    <th className="p-3.5">SKU referencia</th>
                    <th className="p-3.5">Operación</th>
                    <th className="p-3.5 text-right">Cant.</th>
                    <th className="p-3.5">Motivo / Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-gray-400">
                        Ningún registro de movimiento coincide con el criterio de búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((mov) => {
                      const dateObj = new Date(mov.date);
                      const isPositive = mov.type === 'ENTRADA' || (mov.type === 'AJUSTE' && mov.quantity > 0);

                      return (
                        <tr key={mov.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-3.5 pl-4 text-gray-500 whitespace-nowrap">
                            <span className="font-semibold block text-gray-700">
                              {dateObj.toLocaleDateString('es-ES')}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold block text-gray-800">{mov.yarnName}</span>
                            <span className="text-[9.5px] bg-gray-100 text-gray-500 font-semibold px-1.5 py-0.2 rounded">
                              {mov.yarnBrand}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-gray-600 block font-mono">#{mov.colorCode}</span>
                            <span className="text-gray-400 block text-[10px] truncate max-w-[120px]">{mov.colorName}</span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="font-mono text-gray-500 tracking-wider text-[10.5px]">{mov.sku}</span>
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                              mov.type === 'ENTRADA' ? 'bg-green-50 text-green-700 border border-green-100' :
                              mov.type === 'SALIDA' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                              'bg-sky-50 text-sky-700 border border-sky-100'
                            }`}>
                              {mov.type}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-extrabold whitespace-nowrap text-sm">
                            <span className={isPositive ? 'text-green-600' : 'text-orange-600'}>
                              {isPositive ? '+' : ''}{mov.quantity}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="block font-medium text-gray-750">{mov.reason}</span>
                            <span className="block text-[10px] text-gray-400">por: {mov.user}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Print optimization guidance */}
            <div className="flex justify-between items-center text-[11px] text-gray-400 bg-slate-50 p-3 rounded-xl border">
              <span>Consejo: Pulse <strong>Ctrl+P</strong> (Cmd+P) para imprimir esta lista directamente en PDF de forma optimizada.</span>
              <button 
                id="btn-print-screen"
                onClick={() => window.print()}
                className="text-orange-600 hover:text-orange-750 font-bold underline shrink-0 cursor-pointer"
              >
                Imprimir reporte
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
