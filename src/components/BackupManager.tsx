/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  Database,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Yarn, Movement } from '../types';

interface BackupManagerProps {
  yarns: Yarn[];
  movements: Movement[];
  accounts: { username: string; name: string; role: 'admin' | 'staff'; passwordHash: string }[];
  onResetToDemo: () => void;
  onRestoreBackup: (backupData: any) => boolean;
}

export default function BackupManager({
  yarns,
  movements,
  accounts,
  onResetToDemo,
  onRestoreBackup
}: BackupManagerProps) {
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const totalYarns = yarns.length;
  const totalColors = yarns.reduce((acc, curr) => acc + curr.colors.length, 0);
  const totalMoves = movements.length;
  const totalAccounts = accounts.length;

  const handleExportBackup = () => {
    try {
      const backupObj = {
        yarns,
        movements,
        accounts,
        version: "1.1.0",
        exportDate: new Date().toISOString()
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Respaldo_BaseDatos_TejeStock_${new Date().toISOString().substring(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      setSuccessMsg('Base de datos respaldada con éxito. Se ha descargado tu archivo de copia de seguridad (.JSON).');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg('No se pudo generar la exportación del respaldo.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Basic schema integrity check
        if (!parsed.yarns || !Array.isArray(parsed.yarns) || !parsed.movements || !Array.isArray(parsed.movements)) {
          setErrorMsg('Error de integridad: El archivo de copia de seguridad no cuenta con la estructura correcta de TejeStock.');
          return;
        }

        const isSuccess = onRestoreBackup(parsed);
        if (isSuccess) {
          setSuccessMsg('¡Copia de seguridad restaurada correctamente! Todo el catálogo, historial de stock y cuentas se han actualizado.');
          setTimeout(() => setSuccessMsg(''), 6000);
        } else {
          setErrorMsg('Hubo un error importando el archivo de restauración.');
        }

      } catch (err) {
        setErrorMsg('Error al decodificar el archivo JSON de copia de seguridad.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetClick = () => {
    if (confirm('⚙️ ¿Estás seguro de que quieres restablecer la base de datos?\n\nAl hacer esto:\n- Se borrarán tus lanas y colores personalizados.\n- Se restablecerán los catálogos demo de Katia Planet y Craft Lover.\n- Se limpiará el historial de operaciones actual.\n\nEsta acción no se puede deshacer a menos que realices un respaldo previo.')) {
      onResetToDemo();
      setSuccessMsg('Base de datos restablecida con éxito a los valores demo.');
      setTimeout(() => setSuccessMsg(''), 5050);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Respaldo y Seguridad de la Base de Datos</h2>
        <p className="text-xs text-gray-500 font-medium">Exporta copias de seguridad de tus compras, ventas, cuentas y catálogos, restaurándolos en cualquier dispositivo.</p>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 text-green-800 border border-green-200 rounded-2xl text-xs flex items-center gap-3"
        >
          <CheckCircle2 className="text-green-600 shrink-0" size={18} />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs flex items-center gap-3"
        >
          <AlertTriangle className="text-rose-600 shrink-0" size={18} />
          <span>{errorMsg}</span>
        </motion.div>
      )}

      {/* Database stats overview */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 border-r last:border-0 border-gray-100">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Modelos de Lana</span>
          <span className="block text-2xl font-black text-gray-800 tracking-tight mt-1">{totalYarns}</span>
        </div>
        <div className="text-center p-3 border-r last:border-0 border-gray-100">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Colores Totales</span>
          <span className="block text-2xl font-black text-gray-800 tracking-tight mt-1">{totalColors}</span>
        </div>
        <div className="text-center p-3 border-r last:border-0 border-gray-100">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Operaciones de Stock</span>
          <span className="block text-2xl font-black text-gray-800 tracking-tight mt-1">{totalMoves}</span>
        </div>
        <div className="text-center p-3 last:border-0">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cuentas Registradas</span>
          <span className="block text-2xl font-black text-gray-800 tracking-tight mt-1">{totalAccounts}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl w-fit">
              <Download size={22} />
            </div>
            <h3 className="font-bold text-sm text-gray-800">Exportar Copia de Seguridad</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Descarga un archivo portable en formato JSON que contiene todas tus lanas del catálogo, proveedores, ubicaciones de tienda, existencias y el registro de compras/ventas.
            </p>
          </div>

          <button
            id="btn-export-json"
            type="button"
            onClick={handleExportBackup}
            className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
          >
            Descargar Copia de Seguridad
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="space-y-2">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
              <Upload size={22} />
            </div>
            <h3 className="font-bold text-sm text-gray-800">Restaurar Copia de Seguridad</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Sube tu archivo de respaldo de TejeStock (.JSON) guardado previamente. Al restaurar, se reemplazará la base de datos actual con la del archivo.
            </p>
          </div>

          <div className="relative group">
            <input
              id="upload-backup-file"
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportBackup}
              className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
            />
            <button
              id="btn-trigger-upload"
              type="button"
              className="w-full py-2.5 px-4 bg-slate-800 group-hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition text-center"
            >
              Cargar y Reemplazar Base Real
            </button>
          </div>
        </div>

      </div>

      {/* Danger Zone */}
      <div className="bg-rose-50/45 p-6 rounded-3xl border border-rose-100 space-y-4">
        <div>
          <h4 className="font-bold text-xs uppercase tracking-widest text-rose-700 flex items-center gap-1.5">
            <AlertTriangle size={15} /> Zona de Restauración de Fábrica
          </h4>
          <p className="text-xs text-gray-500 mt-1 leading-snug">
            ¿Deseas eliminar y restaurar todo el sistema de lanas al estado predeterminado de demostración limpia?
          </p>
        </div>

        <button
          id="btn-reset-db"
          type="button"
          onClick={handleResetClick}
          className="py-2 px-5 bg-white hover:bg-rose-50 text-rose-700 font-bold border border-rose-200 text-xs rounded-xl shadow-sm transition cursor-pointer"
        >
          Limpiar y Cargar Catálogo Demo de Lanas
        </button>
      </div>

    </div>
  );
}
