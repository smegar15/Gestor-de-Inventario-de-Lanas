/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  ChevronUp,
  ChevronDown,
  Edit3, 
  Trash2, 
  Sparkles, 
  Upload,
  Layers,
  MapPin,
  X,
  FileSpreadsheet,
  FileUp,
  FileText,
  Check,
} from 'lucide-react';
import { Yarn, ColorStorage } from '../types';
import { KATIA_PLANET_SEED, KATIA_CRAFT_LOVER_SEED } from '../data/catalogSeeds';
import { getBagNames, getColorTotalStock, normalizeBags } from '../utils/inventory';
import { processCatalogWithAI } from '../utils/aiProcessor';

interface CatalogManagementProps {
  yarns: Yarn[];
  onAddYarn: (yarn: Yarn) => void;
  onUpdateYarn: (yarn: Yarn) => void;
  onDeleteYarn: (id: string) => void;
  onBulkImport: (importedYarns: Yarn[]) => { successCount: number; errorCount: number };
  geminiKey?: string;
}

export default function CatalogManagement({
  yarns,
  onAddYarn,
  onUpdateYarn,
  onDeleteYarn,
  onBulkImport,
  geminiKey
}: CatalogManagementProps) {
  // Navigation states
  const [selectedYarnId, setSelectedYarnId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('TODAS');
  const [compositionFilter, setCompositionFilter] = useState('TODAS');

  // Form states - For creating/editing Yarn
  const [isYarnModalOpen, setIsYarnModalOpen] = useState(false);
  const [editingYarn, setEditingYarn] = useState<Yarn | null>(null);
  const [yarnForm, setYarnForm] = useState<{
    name: string;
    brand: string;
    composition: string;
    weightGrams: number;
    lengthMeters: number;
    price: number;
    supplier: string;
    notes: string;
    catalogPdf?: { name: string; data: string };
  }>({
    name: '',
    brand: 'Katia',
    composition: '100% Acrílico',
    weightGrams: 100,
    lengthMeters: 200,
    price: 3.50,
    supplier: 'Katia S.A.',
    notes: '',
    catalogPdf: undefined
  });

  // Color form states
  const [isColorFormOpen, setIsColorFormOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<ColorStorage | null>(null);
  const [colorForm, setColorForm] = useState({
    code: '',
    name: '',
    hex: '#FF6B6B',
    stock: 0,
    bagName: '',
    minStock: 5,
    sku: '',
  });
  const [colorSearchTerm, setColorSearchTerm] = useState('');

  // Bulky Import states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [pendingColors, setPendingColors] = useState<ColorStorage[]>([]);
  const [importText, setImportText] = useState('');
  const [importFileFeedback, setImportFileFeedback] = useState('');
  const [importStatus, setImportStatus] = useState<{ success?: number; error?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter lists
  const availableBrands = Array.from(new Set(yarns.map((y) => y.brand)));
  const availableCompositions = Array.from(new Set(yarns.map((y) => y.composition)));
  const availableBagNames = useMemo(() => {
    return Array.from(
      new Set(
        yarns.flatMap((y) => y.colors.flatMap((c) => getBagNames(c)))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [yarns]);

  // Generate automatic SKU
  const generateSKU = (brand: string, yarnName: string, colorCode: string) => {
    const brandCode = brand.substring(0, 3).toUpperCase();
    const yarnCode = yarnName.substring(0, 3).toUpperCase();
    const cleanColor = colorCode.replace(/\s+/g, '');
    return `${brandCode}-${yarnCode}-${cleanColor}`;
  };

  // Filtered yarns list
  const filteredYarns = yarns.filter((y) => {
    const matchesSearch = y.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          y.composition.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          y.colors.some((c) =>
                            c.code.includes(searchTerm) ||
                            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            getBagNames(c).some((bagName) => bagName.toLowerCase().includes(searchTerm.toLowerCase()))
                          );
    
    const matchesBrand = brandFilter === 'TODAS' || y.brand === brandFilter;
    const matchesComposition = compositionFilter === 'TODAS' || y.composition === compositionFilter;

    return matchesSearch && matchesBrand && matchesComposition;
  });

  const selectedYarn = yarns.find((y) => y.id === selectedYarnId);
  useEffect(() => {
    setColorSearchTerm('');
  }, [selectedYarnId]);

  // Submit main Yarn form
  const handleYarnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingYarn) {
      // Update
      const updated: Yarn = {
        ...editingYarn,
        ...yarnForm,
        price: Number(yarnForm.price),
        weightGrams: Number(yarnForm.weightGrams),
        lengthMeters: Number(yarnForm.lengthMeters),
        catalogPdf: yarnForm.catalogPdf
      };
      onUpdateYarn(updated);
    } else {
      // Add
      const newYarn: Yarn = {
        id: `yarn-${Date.now()}`,
        name: yarnForm.name,
        brand: yarnForm.brand,
        composition: yarnForm.composition,
        weightGrams: Number(yarnForm.weightGrams),
        lengthMeters: Number(yarnForm.lengthMeters),
        price: Number(yarnForm.price),
        supplier: yarnForm.supplier,
        notes: yarnForm.notes,
        catalogPdf: yarnForm.catalogPdf,
        createdAt: new Date().toISOString(),
        colors: pendingColors
      };
      onAddYarn(newYarn);
      setSelectedYarnId(newYarn.id);
    }
    setIsYarnModalOpen(false);
    setEditingYarn(null);
    resetYarnForm();
  };

  const resetYarnForm = () => {
    setYarnForm({
      name: '',
      brand: 'Katia',
      composition: '100% Acrílico',
      weightGrams: 100,
      lengthMeters: 200,
      price: 3.50,
      supplier: 'Katia S.A.',
      notes: '',
      catalogPdf: undefined
    });
    setPendingColors([]);
    setImportFileFeedback('');
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('El archivo es demasiado grande (máx 4MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      
      if (!geminiKey) {
        alert("Por favor, configura tu API Key de Gemini en los ajustes para usar la detección automática.");
        setYarnForm(prev => ({ ...prev, catalogPdf: { name: file.name, data: base64Data } }));
        return;
      }

      setIsProcessingAI(true);
      setImportFileFeedback('Conectando con Gemini AI para leer el catálogo...');
      
      try {
        const aiData = await processCatalogWithAI(geminiKey, base64Data, file.name);
        
        setYarnForm({
          name: aiData.name || '',
          brand: aiData.brand || '',
          composition: aiData.composition || '',
          weightGrams: Number(aiData.weightGrams) || 0,
          lengthMeters: Number(aiData.lengthMeters) || 0,
          price: Number(aiData.price) || 0,
          supplier: aiData.supplier || '',
          notes: aiData.notes || '',
          catalogPdf: {
            name: file.name,
            data: base64Data
          }
        });
        
        if (!editingYarn && aiData.colors) {
          const colorsWithBags = aiData.colors.map((c: any) => ({
            ...c,
            stock: 0,
            minStock: 5,
            sku: generateSKU(aiData.brand || '', aiData.name || '', c.code),
            bags: []
          }));
          setPendingColors(colorsWithBags);
          setImportFileFeedback(`✨ ¡IA Éxito! Se han extraído ${colorsWithBags.length} colores automáticamente de "${aiData.brand} ${aiData.name}".`);
        }
      } catch (error: any) {
        console.error(error);
        alert(error.message || "Error al procesar con IA. Se ha guardado el PDF pero los datos no se pudieron extraer.");
        setYarnForm(prev => ({ ...prev, catalogPdf: { name: file.name, data: base64Data } }));
      } finally {
        setIsProcessingAI(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const startEditYarn = (yarn: Yarn, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingYarn(yarn);
    setYarnForm({
      name: yarn.name,
      brand: yarn.brand,
      composition: yarn.composition,
      weightGrams: yarn.weightGrams,
      lengthMeters: yarn.lengthMeters,
      price: yarn.price,
      supplier: yarn.supplier,
      notes: yarn.notes || '',
      catalogPdf: yarn.catalogPdf
    });
    setIsYarnModalOpen(true);
  };

  // Submit Color form inside selected yarn
  const handleColorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYarn) return;

    const generatedSku = colorForm.sku.trim() || generateSKU(selectedYarn.brand, selectedYarn.name, colorForm.code);
    const totalStock = Math.max(0, Number(colorForm.stock) || 0);
    const bagName = colorForm.bagName.trim();
    const bags = bagName && totalStock > 0 ? [{ name: bagName, quantity: totalStock }] : [];

    let updatedColors = [...selectedYarn.colors];
    if (editingColor) {
      // Update existing color
      updatedColors = updatedColors.map((c) => 
        c.code === editingColor.code ? { 
          ...c, 
          code: colorForm.code, 
          name: colorForm.name, 
          hex: colorForm.hex, 
          stock: totalStock,
          minStock: Number(colorForm.minStock), 
          location: bagName || 'Sin bolsa',
          sku: generatedSku,
          bags
        } : c
      );
    } else {
      // Prevent duplicate codes
      if (selectedYarn.colors.some((c) => c.code === colorForm.code)) {
        alert('Este código de color ya existe para esta lana.');
        return;
      }
      
      const newColor: ColorStorage = {
        code: colorForm.code,
        name: colorForm.name,
        hex: colorForm.hex,
        stock: totalStock,
        minStock: Number(colorForm.minStock),
        location: bagName || 'Sin bolsa',
        sku: generatedSku,
        bags
      };
      updatedColors.push(newColor);
    }

    onUpdateYarn({
      ...selectedYarn,
      colors: updatedColors
    });

    setIsColorFormOpen(false);
    setEditingColor(null);
    resetColorForm();
  };

  const resetColorForm = () => {
    setColorForm({
      code: '',
      name: '',
      hex: '#FF6B6B',
      stock: 0,
      bagName: '',
      minStock: 5,
      sku: '',
    });
  };

  const startEditColor = (color: ColorStorage) => {
    const bags = normalizeBags(color);
    setEditingColor(color);
    setColorForm({
      code: color.code,
      name: color.name,
      hex: color.hex,
      stock: getColorTotalStock(color),
      bagName: bags[0]?.name || '',
      minStock: color.minStock,
      sku: color.sku,
    });
    setIsColorFormOpen(true);
  };

  const handleDeleteColor = (code: string) => {
    if (!selectedYarn) return;
    if (confirm(`¿Estás seguro de que quieres eliminar el color #${code} de ${selectedYarn.name}?`)) {
      const updatedColors = selectedYarn.colors.filter((c) => c.code !== code);
      onUpdateYarn({
        ...selectedYarn,
        colors: updatedColors
      });
    }
  };

  const handleQuickAdjustColor = (colorCode: string, delta: number) => {
    if (!selectedYarn) return;

    const updatedColors = selectedYarn.colors.map((color) => {
      if (color.code !== colorCode) return color;

      const cleanedBags = normalizeBags(color);
      if (cleanedBags.length > 0) {
        const preferredBagName = color.location !== 'Sin bolsa' ? color.location : cleanedBags[0]?.name;
        const index = Math.max(0, cleanedBags.findIndex((bag) => bag.name === preferredBagName));
        const currentQty = cleanedBags[index]?.quantity || 0;
        const nextQty = Math.max(0, currentQty + delta);

        const nextBags = [...cleanedBags];
        if (nextQty === 0) {
          nextBags.splice(index, 1);
        } else {
          nextBags[index] = { ...nextBags[index], quantity: nextQty };
        }

        const nextStock = nextBags.reduce((sum, bag) => sum + bag.quantity, 0);
        return {
          ...color,
          bags: nextBags,
          stock: nextStock,
          location: nextBags[0]?.name || 'Sin bolsa',
        };
      }

      const nextStock = Math.max(0, (Number(color.stock) || 0) + delta);
      return {
        ...color,
        stock: nextStock,
        bags: [],
        location: 'Sin bolsa',
      };
    });

    onUpdateYarn({
      ...selectedYarn,
      colors: updatedColors,
    });
  };

  // Pre-set colors list helpers and direct seeds filler
  const loadKatiaPediaSeed = (type: 'planet' | 'craft') => {
    const seed = type === 'planet' ? KATIA_PLANET_SEED : KATIA_CRAFT_LOVER_SEED;
    if (yarns.some((y) => y.id === seed.id)) {
      alert(`La lana ${seed.name} de Katia ya se encuentra en el catálogo.`);
      return;
    }
    onAddYarn(JSON.parse(JSON.stringify(seed)));
    setSelectedYarnId(seed.id);
    alert(`Se ha importado con éxito la lana Katia ${seed.name} con todos sus códigos de colores detallados.`);
  };

  // CSV Parser & copy-paste processor
  const handleBulkImportSubmit = () => {
    if (!importText.trim()) {
      alert('Por favor, ingresa los datos a importar en formato CSV o haz clic en un catálogo demo.');
      return;
    }

    try {
      // Basic CSV Line processor
      // Expected Format: NombreLana,Marca,Composicion,Gramos,Metros,Precio,Proveedor,CodigoColor,NombreColor,HexColor,Stock,MinStock,Ubicacion
      const lines = importText.trim().split('\n');
      const header = lines[0].toLowerCase();
      const hasHeader = header.includes('composición') || header.includes('composicion') || header.includes('marca');
      const startLine = hasHeader ? 1 : 0;

      const importedMap: { [key: string]: Yarn } = {};

      for (let i = startLine; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Smart split by comma handling potential values inside quotes
        const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts.length < 3) continue;

        const woolName = parts[0] || 'Lana Genérica';
        const brand = parts[1] || 'Katia';
        const composition = parts[2] || '100% Acrílico';
        const weightGrams = Number(parts[3]) || 100;
        const lengthMeters = Number(parts[4]) || 200;
        const price = Number(parts[5]) || 3.50;
        const supplier = parts[6] || 'Proveedor Local';
        
        const colorCode = parts[7] || '1';
        const colorName = parts[8] || `Color ${colorCode}`;
        const hex = parts[9] || '#FF6B6B';
        const stock = Number(parts[10]) || 0;
        const minStock = Number(parts[11]) || 5;
        const location = parts[12] || 'Bolsa principal';

        const yarnKey = `${woolName}-${brand}`.toLowerCase();

        if (!importedMap[yarnKey]) {
          importedMap[yarnKey] = {
            id: `yarn-imp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: woolName,
            brand: brand,
            composition: composition,
            weightGrams: weightGrams,
            lengthMeters: lengthMeters,
            price: price,
            supplier: supplier,
            createdAt: new Date().toISOString(),
            colors: []
          };
        }

        const currentYarn = importedMap[yarnKey];
        const generatedSku = generateSKU(brand, woolName, colorCode);

        // Add color if not duplicate code
        if (!currentYarn.colors.some((c) => c.code === colorCode)) {
          currentYarn.colors.push({
            code: colorCode,
            name: colorName,
            hex: hex,
            stock: stock,
            minStock: minStock,
            location: location,
            sku: generatedSku,
            bags: stock > 0 ? [{ name: location, quantity: stock }] : []
          });
        }
      }

      const importedYarnsArray = Object.values(importedMap);
      if (importedYarnsArray.length === 0) {
        alert('No se pudo identificar ningún producto válido en el texto provisto.');
        return;
      }

      const result = onBulkImport(importedYarnsArray);
      setImportStatus({ success: result.successCount, error: result.errorCount });
      setImportText('');
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportStatus(null);
      }, 3000);

    } catch (err) {
      alert('Hubo un error parseando el texto CSV. Verifique que utilice comas como separador.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportText(text);
      setImportFileFeedback(`Archivo "${file.name}" cargado exitosamente. Revise los datos abajo y pulse "Procesar Importación".`);
    };
    reader.onerror = () => {
      alert('Error al leer el archivo.');
    };
    reader.readAsText(file);
  };

  // Template CSV filler
  const fillSampleCSVTemplate = () => {
    const template = `NombreLana,Marca,Composición,PesoGramos,Metros,Precio,Proveedor,CodigoColor,NombreColor,HexColor,StockActual,StockMinimo,Ubicacion
Fama,Katia,100% Acrílico,100,340,3.10,Proveedor Katia,100,Blanco Claro,#FFFFFF,12,5,Estantería A-2
Fama,Katia,100% Acrílico,100,340,3.10,Proveedor Katia,23,Gris Oscuro,#555555,8,4,Estantería A-2
Merino Classic,Katia,52% Merino - 48% Acrílico,100,240,4.80,Proveedor Katia,50,Rojo Carmín,#A30000,15,6,Estantería C-1`;
    setImportText(template);
    setImportFileFeedback('Plantilla de ejemplo cargada en el cuadro de texto. Puede editarla o añadir sus registros.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Catálogo de Lanas</h2>
          <p className="text-xs text-gray-500">Administra tus marcas, colores, bolsas, cantidades por bolsa y stock mínimo.</p>
        </div>
        
        <div className="flex gap-2 flex-wrap w-full md:w-auto">
          <button
            id="btn-import-modal"
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            <Upload size={14} /> Importar Datos (Excel/CSV)
          </button>
          
          <button
            id="btn-add-yarn"
            type="button"
            onClick={() => {
              setEditingYarn(null);
              resetYarnForm();
              setIsYarnModalOpen(true);
            }}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer"
          >
            <Plus size={14} /> Registrar Nueva Lana
          </button>
        </div>
      </div>

      {/* Filter and catalog grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COMPONENT: Search Bar, Quick seed items and list of wool models (4 columns) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100/30 space-y-3">
            {/* Search box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                id="search-yarns"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por color, nombre..."
                className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl py-2 pl-9 pr-4 text-xs text-gray-800 transition"
              />
            </div>

            {/* Quick quick filters */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="filter-brand" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Marca</label>
                <select
                  id="filter-brand"
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none py-1.5 px-2 rounded-lg text-xs text-gray-600"
                >
                  <option value="TODAS">Ver Todas</option>
                  {availableBrands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-composition" className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Composición</label>
                <select
                  id="filter-composition"
                  value={compositionFilter}
                  onChange={(e) => setCompositionFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none py-1.5 px-2 rounded-lg text-xs text-gray-600"
                >
                  <option value="TODAS">Cualquiera</option>
                  {availableCompositions.map((comp) => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick catalog creation shortcuts from customer uploaded PDFs! */}
          {yarns.length < 5 && (
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/60 text-xs">
              <span className="font-bold text-amber-800 flex items-center gap-1.5 mb-2">
                <Sparkles size={14} /> Catálogos Katia Detectados (PDF)
              </span>
              <p className="text-gray-600 mb-3 leading-snug">
                Detectamos páginas de catálogo asociadas a tu cuenta. Puedes cargar instantáneamente todo su espectro cromático y especificaciones técnicas:
              </p>
              <div className="space-y-1.5">
                <button
                  id="btn-seed-planet"
                  type="button"
                  onClick={() => loadKatiaPediaSeed('planet')}
                  className="w-full bg-white hover:bg-orange-50 text-orange-700 hover:text-orange-850 py-1.5 px-2.5 rounded-lg border border-orange-100 text-left font-medium transition cursor-pointer flex justify-between items-center"
                >
                  <span>🌈 Cargar Katia Planet (45 colores)</span>
                  <span className="text-[9px] bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded font-bold">100g</span>
                </button>
                <button
                  id="btn-seed-craft"
                  type="button"
                  onClick={() => loadKatiaPediaSeed('craft')}
                  className="w-full bg-white hover:bg-orange-50 text-orange-700 hover:text-orange-850 py-1.5 px-2.5 rounded-lg border border-orange-100 text-left font-medium transition cursor-pointer flex justify-between items-center"
                >
                  <span>🌈 Cargar Craft Lover (28 colores)</span>
                  <span className="text-[9px] bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded font-bold">50g</span>
                </button>
              </div>
            </div>
          )}

          {/* Yarns listing */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
              Resultados ({filteredYarns.length})
            </span>
            {filteredYarns.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/50 rounded-2xl text-gray-400 text-xs">
                Ninguna lana encontrada con los filtros fijados.
              </div>
            ) : (
              filteredYarns.map((y) => {
                const colorsCount = y.colors.length;
                const totalModelStock = y.colors.reduce((sum, color) => sum + getColorTotalStock(color), 0);
                const isSelected = y.id === selectedYarnId;

                return (
                  <div
                    key={y.id}
                    onClick={() => setSelectedYarnId(y.id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer ${
                      isSelected 
                        ? 'bg-orange-50/50 border-orange-300 shadow-sm' 
                        : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-gray-800">{y.name}</h4>
                          <span className="bg-gray-100 text-gray-600 text-[9px] px-1.5 py-0.2 font-semibold rounded">
                            {y.brand}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">{y.composition}</p>
                      </div>

                      <div className="flex gap-1.5">
                        {y.catalogPdf && (
                          <a
                            href={y.catalogPdf.data}
                            download={y.catalogPdf.name}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition"
                            title="Descargar Catálogo PDF"
                          >
                            <FileText size={13} />
                          </a>
                        )}
                        <button
                          id={`edit-yarn-${y.id}`}
                          type="button"
                          onClick={(e) => startEditYarn(y, e)}
                          className="p-1.5 hover:bg-slate-100 text-gray-400 hover:text-gray-700 rounded-lg transition"
                          title="Editar Ficha"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          id={`delete-yarn-${y.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`¿Estás totalmente seguro de que quieres eliminar la lana ${y.name} y todas sus ${colorsCount} variantes de colores de tu base de datos? This action is permanent.`)) {
                              onDeleteYarn(y.id);
                              if (selectedYarnId === y.id) setSelectedYarnId(null);
                            }
                          }}
                          className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition"
                          title="Eliminar Lana"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed border-gray-100 text-xs text-gray-500">
                      <span>{colorsCount} colores</span>
                      <span className="font-bold text-gray-600 font-mono">Stock: {totalModelStock} uds.</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COMPONENT: Detailed selected Wool variant + Color details (8 columns) */}
        <div className="lg:col-span-8">
          {!selectedYarn ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center space-y-3 min-h-[400px]">
              <Layers size={48} className="text-orange-300 stroke-1" />
              <h3 className="font-bold text-gray-700 text-sm">Ninguna lana seleccionada</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                Selecciona una lana en la lista de la izquierda para ver su ficha técnica detallada y gestionar su inventario de colores de manera unitaria, o añade una nueva lana al catálogo.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-gray-100">
              
              {/* Technical block */}
              <div className="p-6 bg-slate-50/40">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-orange-600">{selectedYarn.brand}</span>
                        <h3 className="text-xl font-extrabold text-gray-800 tracking-tight mt-0.5">{selectedYarn.name}</h3>
                      </div>
                      {selectedYarn.catalogPdf && (
                        <a
                          href={selectedYarn.catalogPdf.data}
                          download={selectedYarn.catalogPdf.name}
                          className="mt-3 flex items-center gap-1.5 py-1 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full transition"
                          title="Ver Catálogo PDF"
                        >
                          <FileText size={12} />
                          Catálogo PDF
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{selectedYarn.composition}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-gray-800 tracking-tight block">
                      {selectedYarn.price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </span>
                    <span className="text-[10px] text-gray-400 block font-semibold">{selectedYarn.weightGrams}g / {selectedYarn.lengthMeters}m</span>
                  </div>
                </div>

                {selectedYarn.notes && (
                  <p className="text-xs text-gray-650 bg-white p-3 rounded-xl border border-slate-100 italic">
                    {selectedYarn.notes}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border">
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider">Proveedor</span>
                    <span className="font-semibold text-gray-700 mt-0.5 block truncate">{selectedYarn.supplier}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border">
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider">Metraje Relativo</span>
                    <span className="font-semibold text-gray-700 mt-0.5 block truncate">{(selectedYarn.lengthMeters / selectedYarn.weightGrams).toFixed(2)} m/g</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border col-span-2 sm:col-span-1">
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider">Variaciones registradas</span>
                    <span className="font-semibold text-gray-700 mt-0.5 block">{selectedYarn.colors.length} colores</span>
                  </div>
                </div>
              </div>

              {/* Color inventory details block */}
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-4">
                  <div>
                    <h4 className="font-bold text-sm text-gray-800">Variantes de Color y Stock Físico</h4>
                    <p className="text-[11px] text-gray-400">Define cuántos ovillos tienes y, si quieres, en qué bolsa principal están. Para repartir en varias bolsas usa “Mis Bolsas”.</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        value={colorSearchTerm}
                        onChange={(e) => setColorSearchTerm(e.target.value)}
                        placeholder="Buscar color (código, nombre, bolsa...)"
                        className="w-full bg-white border border-gray-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 pl-9 pr-3 text-xs text-gray-800 transition"
                      />
                    </div>
                    <button
                      id="btn-add-color"
                      type="button"
                      onClick={() => {
                        setEditingColor(null);
                        resetColorForm();
                        setIsColorFormOpen(true);
                      }}
                      className="flex items-center gap-1.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                    >
                      <Plus size={14} /> Añadir Color
                    </button>
                  </div>
                </div>

                {selectedYarn.colors.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-slate-50/50 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center space-y-2">
                    <Sparkles size={32} className="text-amber-400" />
                    <p className="text-xs font-semibold text-gray-700">Sin colores cargados</p>
                    <p className="text-[11px] max-w-xs">Esta lana no tiene colores configurados aún. ¡Añade tu primer color para gestionar su stock!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {selectedYarn.colors
                      .filter((c) => {
                        const term = colorSearchTerm.trim().toLowerCase();
                        if (!term) return true;
                        return (
                          c.code.toLowerCase().includes(term) ||
                          c.name.toLowerCase().includes(term) ||
                          c.sku.toLowerCase().includes(term) ||
                          getBagNames(c).some((b) => b.toLowerCase().includes(term))
                        );
                      })
                      .map((c) => {
                      const colorStock = getColorTotalStock(c);
                      const isLow = colorStock < c.minStock;

                      return (
                        <div 
                          key={c.code}
                          className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                            isLow ? 'bg-amber-50/30 border-amber-200' : 'bg-slate-50/30 border-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Round Swatch */}
                            <span 
                              className="w-10 h-10 rounded-full border border-gray-200 shadow-inner flex items-center justify-center shrink-0 text-xs font-bold text-white font-mono" 
                              style={{ 
                                backgroundColor: c.hex,
                                textShadow: '0 1.2px 2px rgba(0,0,0,0.7)'
                              }}
                            >
                              {c.code}
                            </span>
                            
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-gray-700 block truncate">{c.name}</span>
                              <div className="text-[10px] text-gray-400 flex flex-wrap gap-x-1.5 mt-0.5 truncate">
                                <span className="font-mono text-gray-500">SKU: {c.sku}</span>
                              </div>
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 mt-1">
                                <MapPin size={9} /> {getBagNames(c).length > 0 ? getBagNames(c).join(', ') : 'Sin bolsas'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className={`block font-mono text-xs font-bold ${
                                isLow ? 'text-rose-600' : 'text-gray-800'
                              }`}>
                                {colorStock} uds.
                              </span>
                              <span className="block text-[9px] text-gray-400 mt-0.5">{getBagNames(c).length > 0 ? `Bolsa: ${getBagNames(c)[0]}` : 'Sin bolsa'}</span>
                              {isLow && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded mt-0.5">
                                  Alto riesgo
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col gap-1 border-l pl-2">
                              <div className="flex flex-col gap-1 pb-1 border-b border-gray-100">
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdjustColor(c.code, 1)}
                                  className="p-1 hover:bg-emerald-50 text-gray-400 hover:text-emerald-700 rounded transition"
                                  title="Añadir 1 unidad"
                                >
                                  <ChevronUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdjustColor(c.code, -1)}
                                  className="p-1 hover:bg-amber-50 text-gray-400 hover:text-amber-700 rounded transition"
                                  title="Quitar 1 unidad"
                                >
                                  <ChevronDown size={14} />
                                </button>
                              </div>
                              <button
                                id={`edit-color-${c.code}`}
                                type="button"
                                onClick={() => startEditColor(c)}
                                className="p-1 hover:bg-slate-100 text-gray-400 hover:text-gray-700 rounded transition"
                                title="Editar parámetros"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                id={`delete-color-${c.code}`}
                                type="button"
                                onClick={() => handleDeleteColor(c.code)}
                                className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded transition"
                                title="Quitar color"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* MODAL 1: Create or edit Yarn modal */}
      <AnimatePresence>
        {isYarnModalOpen && (
          <div id="modal-yarn" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-xl overflow-hidden"
            >
              <div className="bg-orange-600 p-5 text-white flex justify-between items-center">
                <h3 className="font-bold text-base">
                  {editingYarn ? `Editar Lana: ${editingYarn.name}` : 'Registrar Nueva Lana en Catálogo'}
                </h3>
                <button 
                  id="close-yarn-modal"
                  type="button" 
                  onClick={() => setIsYarnModalOpen(false)} 
                  className="p-1.5 bg-orange-700/40 hover:bg-orange-700/60 rounded-full transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleYarnSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="form-name" className="block text-xs font-semibold text-gray-600 mb-1">Nombre Comercial *</label>
                    <input
                      id="form-name"
                      type="text"
                      value={yarnForm.name}
                      onChange={(e) => setYarnForm({ ...yarnForm, name: e.target.value })}
                      placeholder="Ej. Fama"
                      className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-gray-800 transition"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="form-brand" className="block text-xs font-semibold text-gray-600 mb-1">Marca / Diseñador *</label>
                    <input
                      id="form-brand"
                      type="text"
                      value={yarnForm.brand}
                      onChange={(e) => setYarnForm({ ...yarnForm, brand: e.target.value })}
                      placeholder="Ej. Katia"
                      className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-gray-800 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="form-composition" className="block text-xs font-semibold text-gray-600 mb-1">Composición Textil *</label>
                  <input
                    id="form-composition"
                    type="text"
                    value={yarnForm.composition}
                    onChange={(e) => setYarnForm({ ...yarnForm, composition: e.target.value })}
                    placeholder="Ej. 70% Acrílico, 30% Lana"
                    className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-gray-800 transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="form-weight" className="block text-xs font-semibold text-gray-600 mb-1">Peso (gramos) *</label>
                    <input
                      id="form-weight"
                      type="number"
                      value={yarnForm.weightGrams}
                      onChange={(e) => setYarnForm({ ...yarnForm, weightGrams: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-gray-800 transition"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="form-length" className="block text-xs font-semibold text-gray-600 mb-1">Longitud (metros) *</label>
                    <input
                      id="form-length"
                      type="number"
                      value={yarnForm.lengthMeters}
                      onChange={(e) => setYarnForm({ ...yarnForm, lengthMeters: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-gray-800 transition"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="form-price" className="block text-xs font-semibold text-gray-600 mb-1">Precio Compra (€) *</label>
                    <input
                      id="form-price"
                      type="number"
                      step="0.01"
                      value={yarnForm.price}
                      onChange={(e) => setYarnForm({ ...yarnForm, price: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-gray-800 transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label htmlFor="form-supplier" className="block text-xs font-semibold text-gray-600 mb-1">Proveedor Distribuidor</label>
                    <input
                      id="form-supplier"
                      type="text"
                      value={yarnForm.supplier}
                      onChange={(e) => setYarnForm({ ...yarnForm, supplier: e.target.value })}
                      placeholder="Ej. Distribuciones Katia"
                      className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-gray-800 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Catálogo PDF (Opcional)</label>
                  <div className="flex items-center gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 bg-slate-50 border border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50 cursor-pointer rounded-xl py-2 px-3 text-xs font-medium text-slate-600 transition group ${isProcessingAI ? 'animate-pulse' : ''}`}>
                      {isProcessingAI ? (
                        <>
                          <Sparkles size={14} className="text-orange-500 animate-spin" />
                          <span>Escaneando con IA...</span>
                        </>
                      ) : (
                        <>
                          <FileUp size={14} className="text-slate-400 group-hover:text-orange-500" />
                          <span className="truncate">{yarnForm.catalogPdf ? yarnForm.catalogPdf.name : 'Subir catálogo PDF'}</span>
                        </>
                      )}
                      <input
                        id="form-pdf"
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={handlePdfUpload}
                        className="hidden"
                        disabled={isProcessingAI}
                      />
                    </label>
                    {yarnForm.catalogPdf && !isProcessingAI && (
                      <button
                        id="btn-remove-pdf"
                        type="button"
                        onClick={() => setYarnForm(prev => ({ ...prev, catalogPdf: undefined }))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition"
                        title="Eliminar PDF"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  {importFileFeedback && (
                    <p className="text-[10px] text-green-600 mt-2 font-medium bg-green-50 p-2 rounded-lg border border-green-100 flex items-center gap-2">
                      <Check size={12} /> {importFileFeedback}
                    </p>
                  )}
                  <p className="text-[9px] text-gray-400 mt-1">
                    Límite recomendado: 2MB. La IA detectará automáticamente marca, datos técnicos y colores.
                  </p>
                </div>

                <div>
                  <label htmlFor="form-notes" className="block text-xs font-semibold text-gray-600 mb-1">Descripción o Notas de Cuidado</label>
                  <textarea
                    id="form-notes"
                    value={yarnForm.notes}
                    onChange={(e) => setYarnForm({ ...yarnForm, notes: e.target.value })}
                    placeholder="Instrucciones de lavado, recomendación de agujas o usos principales..."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-gray-800 transition"
                  />
                </div>

                <div className="pt-4 border-t flex gap-2">
                  <button
                    id="btn-cancel-yarn"
                    type="button"
                    onClick={() => setIsYarnModalOpen(false)}
                    className="flex-1 py-2 px-4 border border-gray-200 text-gray-500 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    id="btn-save-yarn"
                    type="submit"
                    className="flex-1 py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Create or edit Color modal */}
      <AnimatePresence>
        {isColorFormOpen && selectedYarn && (
          <div id="modal-color" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-xl overflow-hidden"
            >
              <div className="bg-amber-600 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold text-sm">
                  {editingColor ? `Editar parámetros de color #${editingColor.code}` : `Añadir Color a ${selectedYarn.name}`}
                </h3>
                <button 
                  id="close-color-modal"
                  type="button" 
                  onClick={() => setIsColorFormOpen(false)} 
                  className="p-1 bg-amber-700/40 hover:bg-amber-700/60 rounded-full transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleColorSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="color-code" className="block text-xs font-semibold text-gray-600 mb-1">Código de Color *</label>
                    <input
                      id="color-code"
                      type="text"
                      value={colorForm.code}
                      onChange={(e) => setColorForm({ ...colorForm, code: e.target.value })}
                      placeholder="Ej. 3971"
                      className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-amber-500 focus:outline-none rounded-lg py-2 px-3 text-xs text-gray-800 transition font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="color-picker" className="block text-xs font-semibold text-gray-600 mb-1">Visualización Muestra</label>
                    <div className="flex gap-2">
                      <input
                        id="color-picker-input"
                        type="text"
                        value={colorForm.hex}
                        onChange={(e) => setColorForm({ ...colorForm, hex: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 focus:outline-none rounded-lg py-1.5 px-2 text-xs text-gray-800 transition font-mono"
                        required
                      />
                      <input
                        id="color-picker"
                        type="color"
                        value={colorForm.hex}
                        onChange={(e) => setColorForm({ ...colorForm, hex: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer border shrink-0 bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="color-name" className="block text-xs font-semibold text-gray-600 mb-1">Nombre Descriptivo *</label>
                  <input
                    id="color-name"
                    type="text"
                    value={colorForm.name}
                    onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })}
                    placeholder="Ej. Rojo Carmín Potente"
                    className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-amber-500 focus:outline-none rounded-lg py-2 px-3 text-xs text-gray-800 transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="color-min" className="block text-xs font-semibold text-gray-600 mb-1">Alerta Stock Bajo *</label>
                    <input
                      id="color-min"
                      type="number"
                      value={colorForm.minStock}
                      onChange={(e) => setColorForm({ ...colorForm, minStock: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-amber-500 focus:outline-none rounded-lg py-2 px-3 text-xs text-gray-800 transition"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="color-sku" className="block text-xs font-semibold text-gray-600 mb-1">Referencia / SKU</label>
                    <input
                      id="color-sku"
                      type="text"
                      value={colorForm.sku}
                      onChange={(e) => setColorForm({ ...colorForm, sku: e.target.value })}
                      placeholder="Auto-generar"
                      className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-amber-500 focus:outline-none rounded-lg py-2 px-3 text-xs text-gray-800 transition font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="color-stock" className="block text-xs font-semibold text-gray-600 mb-1">Unidades (ovillos) *</label>
                      <input
                        id="color-stock"
                        type="number"
                        min="0"
                        value={colorForm.stock}
                        onChange={(e) => setColorForm({ ...colorForm, stock: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-amber-500 focus:outline-none rounded-lg py-2 px-3 text-xs text-gray-800 transition font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="color-bag" className="block text-xs font-semibold text-gray-600 mb-1">Bolsa (Opcional)</label>
                      <input
                        id="color-bag"
                        type="text"
                        value={colorForm.bagName}
                        onChange={(e) => setColorForm({ ...colorForm, bagName: e.target.value })}
                        placeholder="Ej. Bolsa blanca"
                        list="bag-name-options"
                        className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:border-amber-500 focus:outline-none rounded-lg py-2 px-3 text-xs text-gray-800 transition"
                      />
                      <datalist id="bag-name-options">
                        {availableBagNames.map((bag) => (
                          <option key={bag} value={bag} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-[11px] text-gray-600">
                    Si indicas una bolsa, se guardará todo el stock del color en esa bolsa. Si más adelante quieres repartirlo en varias bolsas, hazlo desde “Mis Bolsas”.
                  </div>
                </div>

                <div className="pt-3 border-t flex gap-2">
                  <button
                    id="btn-cancel-color"
                    type="button"
                    onClick={() => setIsColorFormOpen(false)}
                    className="flex-1 py-2 px-3 border border-gray-200 text-gray-500 hover:bg-slate-50 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Descartar
                  </button>
                  <button
                    id="btn-save-color"
                    type="submit"
                    className="flex-1 py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Bulk CSV Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div id="modal-import" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-xl overflow-hidden"
            >
              <div className="bg-slate-800 p-5 text-white flex justify-between items-center">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <FileSpreadsheet size={18} /> Importación Masiva e Integración de Hojas de Excel / CSV
                </h3>
                <button 
                  id="close-import-modal"
                  type="button" 
                  onClick={() => setIsImportModalOpen(false)} 
                  className="p-1.5 bg-slate-700/40 hover:bg-slate-700/60 rounded-full transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Carga tus productos de lana pegando el contenido tabulado de tu Excel o subiendo tu archivo de catálogo. El sistema unirá inteligentemente los colores agrupándolos bajo el mismo tipo de lana principal.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File Upload zone */}
                  <div className="border-2 border-dashed border-gray-200 hover:border-orange-400 p-5 rounded-2xl text-center bg-slate-50/50 transition relative group">
                    <input
                      id="import-excel-file"
                      type="file"
                      ref={fileInputRef}
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload size={32} className="mx-auto text-gray-400 group-hover:text-orange-500 transition mb-2" />
                    <span className="block font-bold text-xs text-gray-700 mb-1">Cargar Archivo de Catálogo</span>
                    <span className="block text-[10px] text-gray-400">Admite archivos .CSV con separador por comas</span>
                  </div>

                  {/* Manual / Presets box */}
                  <div className="bg-orange-50/30 border border-orange-100 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-xs text-orange-800 block mb-1">Catálogo Inicial Predeterminado</span>
                      <p className="text-[11px] text-orange-700/80 leading-snug">¿No tienes archivos a mano? Carga nuestra estructura predefinida para probar de inmediato.</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        id="btn-fill-template"
                        type="button"
                        onClick={fillSampleCSVTemplate}
                        className="flex-1 py-1.5 px-2 bg-white hover:bg-orange-50 text-orange-700 text-[11px] font-semibold border rounded-lg transition text-center cursor-pointer"
                      >
                        Cargar Plantilla Ejemplo
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-[11px] text-amber-800">
                  Importación de PDF: la voy dejando pensada para la siguiente fase. Lo sencillo ahora es usar CSV o copiar datos, y después automatizamos la lectura de catálogos PDF por marca.
                </div>

                {importFileFeedback && (
                  <p className="p-2 bg-green-50 text-green-700 border border-green-150 text-[11px] rounded-lg">
                    {importFileFeedback}
                  </p>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="import-csv-text" className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Datos en Formato Separado por Comas (CSV)
                    </label>
                    <button
                      id="btn-clear-import"
                      type="button"
                      onClick={() => setImportText('')}
                      className="text-red-500 hover:text-red-650 text-[10px] font-bold"
                    >
                      Limpiar
                    </button>
                  </div>
                  <textarea
                    id="import-csv-text"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="NombreLana,Marca,Composición,PesoGramos,Metros,Precio,Proveedor,CodigoColor,NombreColor,HexColor,Stock,MinStock,Ubicacion..."
                    rows={6}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none rounded-xl p-3 text-[11px] font-mono text-gray-800"
                  />
                </div>

                {importStatus && (
                  <div className="p-3 bg-sky-50 text-sky-800 border rounded-xl text-xs flex items-center justify-between">
                    <span>Procesando lanas de catálogo...</span>
                    <span className="font-bold">
                      Importados con éxito: {importStatus.success} / Errores: {importStatus.error}
                    </span>
                  </div>
                )}

                <div className="pt-4 border-t flex gap-2">
                  <button
                    id="btn-close-import"
                    type="button"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportText('');
                      setImportFileFeedback('');
                    }}
                    className="flex-1 py-2 px-4 border border-gray-200 text-gray-500 hover:bg-slate-50 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Salir
                  </button>
                  <button
                    id="btn-process-import"
                    type="button"
                    onClick={handleBulkImportSubmit}
                    className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                  >
                    Procesar Importación y Fusionar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
