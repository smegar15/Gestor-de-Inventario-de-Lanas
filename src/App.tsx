/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Layers, 
  Database, 
  Menu,
  X,
  ShoppingBag,
  Settings
} from 'lucide-react';

import { Yarn, Movement } from './types';
import { KATIA_PLANET_SEED, KATIA_CRAFT_LOVER_SEED, INITIAL_MOVEMENTS_SEED } from './data/catalogSeeds';
import { normalizeYarn, clearYarnStock } from './utils/inventory';
import { getSupabase, syncYarnsToSupabase, loadYarnsFromSupabase } from './utils/supabase';

// Components
import Dashboard from './components/Dashboard';
import CatalogManagement from './components/CatalogManagement';
import BagManagement from './components/BagManagement';
import BackupManager from './components/BackupManager';

export default function App() {
  // Database States
  const [yarns, setYarns] = useState<Yarn[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [supabaseKey, setSupabaseKey] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // App navigation, UI states
  const [activeTab, setActiveTab] = useState<'inventory' | 'catalog' | 'bags' | 'backup'>('inventory');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize DB from localStorage or seeds
  useEffect(() => {
    // 1. Yarns setup
    const storedYarns = localStorage.getItem('tejestock_yarns_v1');
    if (storedYarns) {
      setYarns(JSON.parse(storedYarns).map(normalizeYarn).map(clearYarnStock));
    } else {
      const initialYarns = [KATIA_PLANET_SEED, KATIA_CRAFT_LOVER_SEED].map(normalizeYarn).map(clearYarnStock);
      setYarns(initialYarns);
      localStorage.setItem('tejestock_yarns_v1', JSON.stringify(initialYarns));
    }

    // 2. Movements setup
    setMovements([]);
    localStorage.setItem('tejestock_moves_v1', JSON.stringify([]));

    // 3. API Key setup
    const storedKey = localStorage.getItem('tejestock_gemini_key');
    if (storedKey) setGeminiKey(storedKey);

    const storedSupaUrl = localStorage.getItem('tejestock_supabase_url');
    const storedSupaKey = localStorage.getItem('tejestock_supabase_key');
    if (storedSupaUrl) setSupabaseUrl(storedSupaUrl);
    if (storedSupaKey) setSupabaseKey(storedSupaKey);

    // 4. Try to load from Supabase if configured
    if (storedSupaUrl && storedSupaKey) {
      loadYarnsFromSupabase().then(data => {
        if (data) setYarns(data);
      });
    }
  }, []);

  // Save changes to localStorage whenever states change
  const saveYarns = (updatedYarns: Yarn[]) => {
    const normalized = updatedYarns.map(normalizeYarn);
    setYarns(normalized);
    localStorage.setItem('tejestock_yarns_v1', JSON.stringify(normalized));
    syncYarnsToSupabase(normalized);
  };

  const saveConfig = (gemini: string, supaUrl: string, supaKey: string) => {
    setGeminiKey(gemini);
    localStorage.setItem('tejestock_gemini_key', gemini);
    
    setSupabaseUrl(supaUrl);
    setSupabaseKey(supaKey);
    localStorage.setItem('tejestock_supabase_url', supaUrl);
    localStorage.setItem('tejestock_supabase_key', supaKey);
    
    // Reset connection
    getSupabase(supaUrl, supaKey);
    
    setIsSettingsOpen(false);
  };

  const saveMovements = (updatedMovements: Movement[]) => {
    setMovements(updatedMovements);
    localStorage.setItem('tejestock_moves_v1', JSON.stringify(updatedMovements));
  };

  // Catalog update flow handlers
  const handleAddYarn = (newYarn: Yarn) => {
    const updated = [...yarns, newYarn];
    saveYarns(updated);
  };

  const handleUpdateYarn = (updatedYarn: Yarn) => {
    const updated = yarns.map((y) => y.id === updatedYarn.id ? updatedYarn : y);
    saveYarns(updated);
  };

  const handleDeleteYarn = (id: string) => {
    const updated = yarns.filter((y) => y.id !== id);
    saveYarns(updated);

    // Filter movements associated to delete
    // (Alternative is leaving them for history but we can just retain them safely)
  };

  // Bulk import tool execution
  const handleBulkImportYarns = (importedList: Yarn[]) => {
    let successCount = 0;
    let errorCount = 0;

    const mergedYarns = [...yarns];

    importedList.forEach((imp) => {
      // Look for identical Name & Brand to merge colors
      const matchIndex = mergedYarns.findIndex((y) => 
        y.name.toLowerCase() === imp.name.toLowerCase() &&
        y.brand.toLowerCase() === imp.brand.toLowerCase()
      );

      if (matchIndex >= 0) {
        // Merge colors avoiding duplicating color code
        const matchedYarn = mergedYarns[matchIndex];
        imp.colors.forEach((c) => {
          if (!matchedYarn.colors.some((item) => item.code === c.code)) {
            matchedYarn.colors.push(c);
            successCount++;
          } else {
            errorCount++;
          }
        });
      } else {
        // Create new yarn entirely
        mergedYarns.push(imp);
        successCount += imp.colors.length;
      }
    });

    saveYarns(mergedYarns);
    return { successCount, errorCount };
  };

  // Backup operations restore/reset
  const handleResetToDemo = () => {
    localStorage.removeItem('tejestock_yarns_v1');
    localStorage.removeItem('tejestock_moves_v1');

    const resetYarns = [KATIA_PLANET_SEED, KATIA_CRAFT_LOVER_SEED].map(normalizeYarn).map(clearYarnStock);
    setYarns(resetYarns);
    setMovements([]);

    localStorage.setItem('tejestock_yarns_v1', JSON.stringify(resetYarns));
    localStorage.setItem('tejestock_moves_v1', JSON.stringify([]));
  };

  const handleRestoreBackup = (backup: any) => {
    try {
      if (backup.yarns) saveYarns(backup.yarns);
      if (backup.movements) saveMovements(backup.movements);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-gray-800">
      
      {/* 1. SIDEBAR NAVIGATION - Responsive */}
      <aside className={`bg-slate-900 text-slate-300 w-full md:w-64 shrink-0 transition-all z-40 relative md:sticky md:top-0 md:h-screen flex flex-col justify-between border-r border-slate-800`}>
        
        {/* Brand header */}
        <div>
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              🧶 TejeStock
            </h1>
            <button
              id="mobile-menu-toggle"
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-gray-400 hover:text-white transition cursor-pointer p-1"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Navigation Links list */}
          <nav className={`p-4 space-y-1.5 ${isMobileMenuOpen ? 'block' : 'hidden md:block'}`}>
            <button
              id="nav-tab-inventory"
              onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                activeTab === 'inventory' 
                  ? 'bg-orange-600 text-white shadow-md' 
                  : 'hover:bg-slate-850 hover:text-white'
              }`}
            >
              <BarChart3 size={16} />
              <span>Mi Inventario</span>
            </button>

            <button
              id="nav-tab-catalog"
              onClick={() => { setActiveTab('catalog'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                activeTab === 'catalog' 
                  ? 'bg-orange-600 text-white shadow-md' 
                  : 'hover:bg-slate-850 hover:text-white'
              }`}
            >
              <Layers size={16} />
              <span>Catálogo Lanas</span>
            </button>

            <button
              id="nav-tab-bags"
              onClick={() => { setActiveTab('bags'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                activeTab === 'bags' 
                  ? 'bg-orange-600 text-white shadow-md' 
                  : 'hover:bg-slate-850 hover:text-white'
              }`}
            >
              <ShoppingBag size={16} />
              <span>Mis Bolsas</span>
            </button>

            <button
              id="nav-tab-backup"
              onClick={() => { setActiveTab('backup'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                activeTab === 'backup' 
                  ? 'bg-orange-600 text-white shadow-md' 
                  : 'hover:bg-slate-850 hover:text-white'
              }`}
            >
              <Database size={16} />
              <span>Respaldo</span>
            </button>

            <button
              id="btn-open-settings"
              onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer text-left hover:bg-slate-850 hover:text-white"
            >
              <Settings size={16} />
              <span>Configuración IA</span>
            </button>
          </nav>
        </div>

      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main id="main-content" className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full transition-all">
        
        {/* Animated router switcher */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'inventory' && (
              <Dashboard 
                yarns={yarns} 
                onNavigate={() => setActiveTab('catalog')}
              />
            )}

            {activeTab === 'catalog' && (
              <CatalogManagement 
                yarns={yarns}
                onAddYarn={handleAddYarn}
                onUpdateYarn={handleUpdateYarn}
                onDeleteYarn={handleDeleteYarn}
                onBulkImport={handleBulkImportYarns}
                geminiKey={geminiKey}
              />
            )}

            {activeTab === 'bags' && (
              <BagManagement 
                yarns={yarns}
                onUpdateYarns={saveYarns}
              />
            )}

            {activeTab === 'backup' && (
              <BackupManager 
                yarns={yarns}
                movements={movements}
                accounts={[]}
                onResetToDemo={handleResetToDemo}
                onRestoreBackup={handleRestoreBackup}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden"
            >
              <div className="bg-slate-800 p-5 text-white flex justify-between items-center">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Settings size={18} /> Configuración IA
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-1.5 hover:bg-slate-700 rounded-full transition">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-orange-600 uppercase tracking-widest border-b border-orange-100 pb-2">
                    Inteligencia Artificial
                  </h4>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                      Google Gemini API Key
                    </label>
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="Pega aquí tu API Key de Gemini..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-3 px-4 text-sm text-gray-800 transition"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-2">
                    Base de Datos (Supabase)
                  </h4>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                      Supabase Project URL
                    </label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xyz.supabase.co"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl py-3 px-4 text-sm text-gray-800 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                      Supabase Anon Key
                    </label>
                    <input
                      type="password"
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      placeholder="Pega aquí tu Anon Key..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl py-3 px-4 text-sm text-gray-800 transition"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="flex-1 py-3 px-4 border border-gray-200 text-gray-500 hover:bg-slate-50 text-xs font-bold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => saveConfig(geminiKey, supabaseUrl, supabaseKey)}
                    className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition shadow-md"
                  >
                    Guardar Todo
                  </button>
                </div>
                
                <div className="pt-2 text-center space-y-2">
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-orange-600 hover:underline font-bold block"
                  >
                    ¿Cómo consigo la API Key de Gemini?
                  </a>
                  <a 
                    href="https://supabase.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-600 hover:underline font-bold block"
                  >
                    ¿Cómo creo mi base de datos en Supabase?
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
