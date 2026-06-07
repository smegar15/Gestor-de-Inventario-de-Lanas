/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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

import { Bag, Yarn, Movement } from './types';
import { KATIA_PLANET_SEED, KATIA_CRAFT_LOVER_SEED } from './data/catalogSeeds';
import { normalizeYarn, clearYarnStock } from './utils/inventory';
import { getSupabase, syncYarnsToSupabase, loadYarnsFromSupabase, testSupabaseConnection } from './utils/supabase';

// Components
import Dashboard from './components/Dashboard';
import CatalogManagement from './components/CatalogManagement';
import BagManagement from './components/BagManagement';
import BackupManager from './components/BackupManager';

export default function App() {
  // Database States
  const [yarns, setYarns] = useState<Yarn[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [bags, setBags] = useState<Bag[]>([]);
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [supabaseUrl, setSupabaseUrl] = useState<string>('');
  const [supabaseKey, setSupabaseKey] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('offline');
  const [lastCloudLoad, setLastCloudLoad] = useState<{ count: number; at: string } | null>(null);
  
  // App navigation, UI states
  const [activeTab, setActiveTab] = useState<'inventory' | 'catalog' | 'bags' | 'backup'>('inventory');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize DB from localStorage or seeds
  useEffect(() => {
    const init = async () => {
      const cleanValue = (value: unknown): string => {
        if (typeof value !== 'string') return '';
        const trimmed = value.trim();
        const unquoted =
          (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
            ? trimmed.slice(1, -1)
            : trimmed;
        return unquoted.trim();
      };

      const normalizeBagName = (name: unknown): string => (typeof name === 'string' ? name.trim() : '');

      const extractBagNamesFromYarns = (inputYarns: Yarn[]): string[] => {
        const names = new Set<string>();
        inputYarns.forEach((yarn) => {
          yarn.colors.forEach((color) => {
            (color.bags || []).forEach((bag) => {
              const clean = normalizeBagName(bag.name);
              if (clean) names.add(clean);
            });
          });
        });
        return Array.from(names);
      };

      const mergeBagsWithYarns = (existingBags: Bag[], inputYarns: Yarn[]): Bag[] => {
        const byName = new Map<string, Bag>();
        existingBags.forEach((bag) => {
          const clean = normalizeBagName(bag.name);
          if (!clean) return;
          byName.set(clean, {
            name: clean,
            location: typeof bag.location === 'string' ? bag.location : '',
            createdAt: typeof bag.createdAt === 'string' ? bag.createdAt : new Date().toISOString(),
          });
        });

        extractBagNamesFromYarns(inputYarns).forEach((name) => {
          if (!byName.has(name)) {
            byName.set(name, { name, location: '', createdAt: new Date().toISOString() });
          }
        });

        return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
      };

      const envGemini = import.meta.env.VITE_GEMINI_API_KEY;
      const storedKey = localStorage.getItem('tejestock_gemini_key');
      const initialGeminiKey = cleanValue(envGemini || storedKey || '');
      if (initialGeminiKey) setGeminiKey(initialGeminiKey);

      const storedSupaUrlRaw =
        localStorage.getItem('tejestock_supabase_url') || import.meta.env.VITE_SUPABASE_URL;
      const storedSupaKeyRaw =
        localStorage.getItem('tejestock_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const storedSupaUrl = cleanValue(storedSupaUrlRaw);
      const storedSupaKey = cleanValue(storedSupaKeyRaw);
      if (storedSupaUrl) setSupabaseUrl(storedSupaUrl);
      if (storedSupaKey) setSupabaseKey(storedSupaKey);

      const storedYarns = localStorage.getItem('tejestock_yarns_v1');
      const localYarns: Yarn[] | null = storedYarns ? JSON.parse(storedYarns).map(normalizeYarn) : null;

      const storedBags = localStorage.getItem('tejestock_bags_v1');
      const localBags: Bag[] =
        storedBags && storedBags.trim() ? (JSON.parse(storedBags) as Bag[]) : [];

      setMovements([]);
      localStorage.setItem('tejestock_moves_v1', JSON.stringify([]));

      const supaClient = getSupabase(storedSupaUrl || undefined, storedSupaKey || undefined);
      if (supaClient) {
        setSyncStatus('syncing');
        const test = await testSupabaseConnection();
        if (test.ok) {
          const remote = await loadYarnsFromSupabase();
          const remoteYarns: Yarn[] | null =
            Array.isArray(remote) ? remote :
            (remote && Array.isArray((remote as any).yarns) ? (remote as any).yarns : null);
          const remoteBags: Bag[] | null =
            remote && Array.isArray((remote as any).bags) ? (remote as any).bags : null;

          if (remoteYarns && remoteYarns.length > 0) {
            const normalizedRemote = remoteYarns.map(normalizeYarn);
            setYarns(normalizedRemote);
            localStorage.setItem('tejestock_yarns_v1', JSON.stringify(normalizedRemote));
            const nextBags = mergeBagsWithYarns(remoteBags || localBags, normalizedRemote);
            setBags(nextBags);
            localStorage.setItem('tejestock_bags_v1', JSON.stringify(nextBags));
            setSyncStatus('synced');
            setLastCloudLoad({ count: normalizedRemote.length, at: new Date().toISOString() });
            return;
          }

          if (localYarns) {
            const normalizedLocal = localYarns.map(normalizeYarn);
            const nextBags = mergeBagsWithYarns(localBags, normalizedLocal);
            const success = await syncYarnsToSupabase(normalizedLocal, nextBags);
            setSyncStatus(success ? 'synced' : 'offline');
            setYarns(normalizedLocal);
            setBags(nextBags);
            localStorage.setItem('tejestock_bags_v1', JSON.stringify(nextBags));
            return;
          }

          const initialYarns = [KATIA_PLANET_SEED, KATIA_CRAFT_LOVER_SEED].map(normalizeYarn).map(clearYarnStock);
          const nextBags = mergeBagsWithYarns(localBags, initialYarns);
          const success = await syncYarnsToSupabase(initialYarns, nextBags);
          setSyncStatus(success ? 'synced' : 'offline');
          setYarns(initialYarns);
          setBags(nextBags);
          localStorage.setItem('tejestock_yarns_v1', JSON.stringify(initialYarns));
          localStorage.setItem('tejestock_bags_v1', JSON.stringify(nextBags));
          if (success) setLastCloudLoad({ count: initialYarns.length, at: new Date().toISOString() });
          return;
        } else {
          setSyncStatus('offline');
        }
      }

      if (localYarns) {
        const normalizedLocal = localYarns.map(normalizeYarn);
        setYarns(normalizedLocal);
        const nextBags = mergeBagsWithYarns(localBags, normalizedLocal);
        setBags(nextBags);
        localStorage.setItem('tejestock_bags_v1', JSON.stringify(nextBags));
        return;
      }

      const initialYarns = [KATIA_PLANET_SEED, KATIA_CRAFT_LOVER_SEED].map(normalizeYarn).map(clearYarnStock);
      setYarns(initialYarns);
      localStorage.setItem('tejestock_yarns_v1', JSON.stringify(initialYarns));
      const nextBags = mergeBagsWithYarns(localBags, initialYarns);
      setBags(nextBags);
      localStorage.setItem('tejestock_bags_v1', JSON.stringify(nextBags));
    };

    init();
  }, []);

  // Save changes to localStorage whenever states change
  const saveYarns = async (updatedYarns: Yarn[]) => {
    const normalizeBagName = (name: unknown): string => (typeof name === 'string' ? name.trim() : '');
    const extractBagNamesFromYarns = (inputYarns: Yarn[]): string[] => {
      const names = new Set<string>();
      inputYarns.forEach((yarn) => {
        yarn.colors.forEach((color) => {
          (color.bags || []).forEach((bag) => {
            const clean = normalizeBagName(bag.name);
            if (clean) names.add(clean);
          });
        });
      });
      return Array.from(names);
    };

    const mergeBagsWithYarns = (existingBags: Bag[], inputYarns: Yarn[]): Bag[] => {
      const byName = new Map<string, Bag>();
      existingBags.forEach((bag) => {
        const clean = normalizeBagName(bag.name);
        if (!clean) return;
        byName.set(clean, {
          name: clean,
          location: typeof bag.location === 'string' ? bag.location : '',
          createdAt: typeof bag.createdAt === 'string' ? bag.createdAt : new Date().toISOString(),
        });
      });

      extractBagNamesFromYarns(inputYarns).forEach((name) => {
        if (!byName.has(name)) {
          byName.set(name, { name, location: '', createdAt: new Date().toISOString() });
        }
      });

      return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
    };

    const normalized = updatedYarns.map(normalizeYarn);
    setYarns(normalized);
    localStorage.setItem('tejestock_yarns_v1', JSON.stringify(normalized));

    const nextBags = mergeBagsWithYarns(bags, normalized);
    setBags(nextBags);
    localStorage.setItem('tejestock_bags_v1', JSON.stringify(nextBags));
    
    if (supabaseUrl && supabaseKey) {
      setSyncStatus('syncing');
      const success = await syncYarnsToSupabase(normalized, nextBags);
      setSyncStatus(success ? 'synced' : 'offline');
    }
  };

  const saveBags = async (updatedBags: Bag[]) => {
    setBags(updatedBags);
    localStorage.setItem('tejestock_bags_v1', JSON.stringify(updatedBags));

    if (supabaseUrl && supabaseKey) {
      setSyncStatus('syncing');
      const success = await syncYarnsToSupabase(yarns, updatedBags);
      setSyncStatus(success ? 'synced' : 'offline');
    }
  };

  const saveConfig = async (gemini: string, supaUrl: string, supaKey: string) => {
    const cleanValue = (value: string) => value.trim();
    const nextGeminiKey = cleanValue(gemini);
    const nextSupabaseUrl = cleanValue(supaUrl);
    const nextSupabaseKey = cleanValue(supaKey);

    setGeminiKey(nextGeminiKey);
    setSupabaseUrl(nextSupabaseUrl);
    setSupabaseKey(nextSupabaseKey);

    if (nextGeminiKey) {
      localStorage.setItem('tejestock_gemini_key', nextGeminiKey);
    } else {
      localStorage.removeItem('tejestock_gemini_key');
    }

    if (nextSupabaseUrl) {
      localStorage.setItem('tejestock_supabase_url', nextSupabaseUrl);
    } else {
      localStorage.removeItem('tejestock_supabase_url');
    }

    if (nextSupabaseKey) {
      localStorage.setItem('tejestock_supabase_key', nextSupabaseKey);
    } else {
      localStorage.removeItem('tejestock_supabase_key');
    }

    getSupabase(nextSupabaseUrl, nextSupabaseKey);

    if (nextSupabaseUrl && nextSupabaseKey) {
      setSyncStatus('syncing');
      const test = await testSupabaseConnection();
      if (!test.ok) {
        setSyncStatus('offline');
        alert(
          `Supabase no está accesible todavía.\n\n${test.message}\n\n` +
          `Causas típicas:\n` +
          `- No existe la tabla \"inventory\".\n` +
          `- RLS activado sin políticas.\n` +
          `- URL o Anon Key incorrectas.`
        );
      } else {
        const success = await syncYarnsToSupabase(yarns, bags);
        setSyncStatus(success ? 'synced' : 'offline');
      }
    } else {
      setSyncStatus('offline');
    }

    setIsSettingsOpen(false);
  };

  const clearSavedKeys = () => {
    localStorage.removeItem('tejestock_gemini_key');
    localStorage.removeItem('tejestock_supabase_url');
    localStorage.removeItem('tejestock_supabase_key');
    const client = getSupabase();
    if (client) {
      setSyncStatus('syncing');
      testSupabaseConnection().then((result) => {
        setSyncStatus(result.ok ? 'synced' : 'offline');
      });
    } else {
      setSyncStatus('offline');
    }
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
    localStorage.removeItem('tejestock_bags_v1');

    const resetYarns = [KATIA_PLANET_SEED, KATIA_CRAFT_LOVER_SEED].map(normalizeYarn).map(clearYarnStock);
    setYarns(resetYarns);
    setMovements([]);
    setBags([]);

    localStorage.setItem('tejestock_yarns_v1', JSON.stringify(resetYarns));
    localStorage.setItem('tejestock_moves_v1', JSON.stringify([]));
    localStorage.setItem('tejestock_bags_v1', JSON.stringify([]));
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
            <div className="flex items-center gap-4">
              {supabaseUrl && supabaseKey && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    syncStatus === 'synced' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                    syncStatus === 'syncing' ? 'bg-orange-500 animate-pulse' : 
                    'bg-gray-500'
                  }`} />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {syncStatus === 'synced' ? 'Nube OK' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Sin Conexión'}
                  </span>
                </div>
              )}
              <button
                id="mobile-menu-toggle"
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden text-gray-400 hover:text-white transition cursor-pointer p-1"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
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
                bags={bags}
                onUpdateYarns={saveYarns}
                onUpdateBags={saveBags}
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
                  <div className="text-[10px] text-gray-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                    Estado: <span className="font-bold">{syncStatus === 'synced' ? 'Nube OK' : syncStatus === 'syncing' ? 'Sincronizando…' : 'Sin conexión'}</span>
                    {lastCloudLoad && (
                      <span className="block mt-1">
                        Última carga desde nube: <span className="font-bold">{lastCloudLoad.count}</span> lanas ({new Date(lastCloudLoad.at).toLocaleString('es-ES')})
                      </span>
                    )}
                  </div>
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

                <div className="pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={clearSavedKeys}
                    className="w-full py-2.5 px-3 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition"
                  >
                    Borrar claves guardadas en este navegador
                  </button>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">
                    Si usas .env.local, la app seguirá funcionando aunque borres estas claves.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
