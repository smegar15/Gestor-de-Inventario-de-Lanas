import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Folder, Plus, Trash2, Upload, Sparkles, X, Check, AlertTriangle, Save } from 'lucide-react';
import { Project, ProjectCostItem, ProjectDimensions, ProjectPaletteColor, ProjectSelection, ProjectSizeUnit, Yarn } from '../types';
import { getColorTotalStock } from '../utils/inventory';
import { estimateYarnUsageWithAI, extractDesignPaletteWithAI } from '../utils/aiProcessor';

interface ProjectsManagementProps {
  yarns: Yarn[];
  projects: Project[];
  geminiKey?: string;
  onUpdateProjects: (projects: Project[]) => void;
}

type Recommendation = {
  yarnId: string;
  yarnName: string;
  brand: string;
  colorCode: string;
  colorName: string;
  hex: string;
  stock: number;
  distance: number;
  status: 'IN_STOCK' | 'OUT_OF_STOCK';
};

const normalizeHex = (value: string): string | null => {
  const v = value.trim().toUpperCase();
  const match = v.match(/^#([0-9A-F]{6})$/);
  return match ? `#${match[1]}` : null;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const clean = normalizeHex(hex);
  if (!clean) return null;
  const raw = clean.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
};

const rgbDistance = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number => {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

const loadImage = (dataUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    img.src = dataUrl;
  });

const compressImageDataUrl = async (dataUrl: string): Promise<string> => {
  const img = await loadImage(dataUrl);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) return dataUrl;

  let maxSide = 1200;
  let quality = 0.78;

  for (let i = 0; i < 4; i++) {
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const outW = Math.max(1, Math.round(width * scale));
    const outH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, outW, outH);

    const out = canvas.toDataURL('image/jpeg', quality);
    const bytes = out.length;
    if (bytes <= 1_600_000) return out;

    if (i === 0) {
      quality = 0.65;
    } else if (i === 1) {
      maxSide = 900;
      quality = 0.62;
    } else if (i === 2) {
      maxSide = 720;
      quality = 0.58;
    }
  }

  return dataUrl;
};

const fetchImageAsDataUrl = async (url: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo descargar la imagen guardada.');
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen guardada.'));
    reader.readAsDataURL(blob);
  });
  return dataUrl;
};

const createFocusedThumbnail = async (
  dataUrl: string,
  targetHex: string,
  options?: { outputSize?: number; scanMaxSize?: number; threshold?: number }
): Promise<string> => {
  const outputSize = options?.outputSize ?? 96;
  const scanMaxSize = options?.scanMaxSize ?? 220;
  const threshold = options?.threshold ?? 62;

  const target = hexToRgb(targetHex);
  if (!target) return '';

  const img = await loadImage(dataUrl);
  const originalWidth = img.naturalWidth || img.width;
  const originalHeight = img.naturalHeight || img.height;
  if (!originalWidth || !originalHeight) return '';

  const scale = Math.min(1, scanMaxSize / Math.max(originalWidth, originalHeight));
  const scanW = Math.max(1, Math.round(originalWidth * scale));
  const scanH = Math.max(1, Math.round(originalHeight * scale));

  const scanCanvas = document.createElement('canvas');
  scanCanvas.width = scanW;
  scanCanvas.height = scanH;
  const scanCtx = scanCanvas.getContext('2d');
  if (!scanCtx) return '';

  scanCtx.drawImage(img, 0, 0, scanW, scanH);
  const imageData = scanCtx.getImageData(0, 0, scanW, scanH);
  const data = imageData.data;

  let minX = scanW;
  let minY = scanH;
  let maxX = 0;
  let maxY = 0;
  let hits = 0;
  const step = scanW * scanH > 120_000 ? 3 : 2;

  for (let y = 0; y < scanH; y += step) {
    for (let x = 0; x < scanW; x += step) {
      const idx = (y * scanW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a < 40) continue;

      const dist = rgbDistance(target, { r, g, b });
      if (dist <= threshold) {
        hits++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  let cropX = 0;
  let cropY = 0;
  let cropW = originalWidth;
  let cropH = originalHeight;

  if (hits >= 40) {
    const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.25) + 10;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const side = Math.max(maxX - minX, maxY - minY) + pad * 2;

    const left = cx - side / 2;
    const top = cy - side / 2;

    const factor = 1 / scale;
    cropX = Math.max(0, Math.floor(left * factor));
    cropY = Math.max(0, Math.floor(top * factor));
    const endX = Math.min(originalWidth, Math.ceil((left + side) * factor));
    const endY = Math.min(originalHeight, Math.ceil((top + side) * factor));
    cropW = Math.max(1, endX - cropX);
    cropH = Math.max(1, endY - cropY);
  } else {
    const side = Math.min(originalWidth, originalHeight);
    cropX = Math.floor((originalWidth - side) / 2);
    cropY = Math.floor((originalHeight - side) / 2);
    cropW = side;
    cropH = side;
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outputSize;
  outCanvas.height = outputSize;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return '';
  outCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outputSize, outputSize);
  return outCanvas.toDataURL('image/jpeg', 0.76);
};

export default function ProjectsManagement({ yarns, projects, geminiKey, onUpdateProjects }: ProjectsManagementProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.id || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [newCostName, setNewCostName] = useState('');
  const [newCostCategory, setNewCostCategory] = useState('Material');
  const [newCostQty, setNewCostQty] = useState<number>(1);
  const [newCostUnitCost, setNewCostUnitCost] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = useMemo(() => projects.find((p) => p.id === selectedProjectId) || null, [projects, selectedProjectId]);

  const costItems = selectedProject?.costItems || [];
  const dimensions: ProjectDimensions = selectedProject?.dimensions || { width: 0, height: 0, unit: 'cm', technique: 'Tejido' };

  const catalogColorOptions = useMemo(() => {
    return yarns.flatMap((yarn) =>
      yarn.colors.map((color) => ({
        yarnId: yarn.id,
        yarnName: yarn.name,
        brand: yarn.brand,
        colorCode: color.code,
        colorName: color.name,
        hex: color.hex,
        stock: getColorTotalStock(color),
      }))
    );
  }, [yarns]);

  const catalogColorOptionsRgb = useMemo(() => {
    return catalogColorOptions
      .map((opt) => {
        const rgb = hexToRgb(opt.hex);
        if (!rgb) return null;
        return { ...opt, rgb };
      })
      .filter(Boolean) as (typeof catalogColorOptions[number] & { rgb: { r: number; g: number; b: number } })[];
  }, [catalogColorOptions]);

  const recommendationsByPalette = useMemo(() => {
    if (!selectedProject?.palette || selectedProject.palette.length === 0) return [];
    return selectedProject.palette
      .map((c) => {
        const designHex = normalizeHex(c.hex);
        const designRgb = designHex ? hexToRgb(designHex) : null;
        if (!designHex || !designRgb) return null;

        const scored: Recommendation[] = catalogColorOptionsRgb
          .map((opt) => ({
            yarnId: opt.yarnId,
            yarnName: opt.yarnName,
            brand: opt.brand,
            colorCode: opt.colorCode,
            colorName: opt.colorName,
            hex: normalizeHex(opt.hex) || opt.hex,
            stock: opt.stock,
            distance: rgbDistance(designRgb, opt.rgb),
            status: opt.stock > 0 ? ('IN_STOCK' as const) : ('OUT_OF_STOCK' as const),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 4)
          .map((s) => ({ ...s, distance: Number(s.distance.toFixed(1)) }));

        const bestDistance = scored[0]?.distance ?? Infinity;
        return {
          design: { hex: designHex, name: c.name || 'Color', weight: c.weight },
          shouldBuy: bestDistance > 120,
          suggestions: scored,
        };
      })
      .filter(Boolean) as {
      design: { hex: string; name: string; weight: number };
      shouldBuy: boolean;
      suggestions: Recommendation[];
    }[];
  }, [selectedProject?.palette, catalogColorOptionsRgb]);

  const createProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const next: Project = {
      id: `proj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      selections: [],
      costItems: [],
      dimensions: { width: 0, height: 0, unit: 'cm', technique: 'Tejido' },
      createdAt: now,
      updatedAt: now,
      notes: '',
    };
    const updated = [next, ...projects];
    onUpdateProjects(updated);
    setSelectedProjectId(next.id);
    setIsModalOpen(false);
    setNewProjectName('');
    setFeedback('');
    setEditingName(false);
    setNotesDraft('');
  };

  const updateProject = (patch: Partial<Project>) => {
    if (!selectedProject) return;
    const updated = projects.map((p) =>
      p.id === selectedProject.id
        ? {
            costItems: p.costItems || [],
            dimensions: p.dimensions || { width: 0, height: 0, unit: 'cm', technique: 'Tejido' },
            ...p,
            ...patch,
            updatedAt: new Date().toISOString(),
          }
        : p
    );
    onUpdateProjects(updated);
  };

  const deleteProject = () => {
    if (!selectedProject) return;
    if (!confirm(`¿Eliminar el proyecto "${selectedProject.name}"?`)) return;
    const updated = projects.filter((p) => p.id !== selectedProject.id);
    onUpdateProjects(updated);
    setSelectedProjectId(updated[0]?.id || null);
    setFeedback('');
    setEditingName(false);
    setNotesDraft('');
  };

  const handleSaveProjects = () => {
    onUpdateProjects([...projects]);
    setFeedback('Proyecto guardado.');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor, sube una imagen (PNG/JPG/WebP).');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      alert('El archivo es demasiado grande (máx 6MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setIsAnalyzing(true);
        setFeedback('Procesando imagen para guardarla de forma ligera...');
        const base64 = reader.result as string;
        const compressed = await compressImageDataUrl(base64);
        updateProject({
          image: { name: file.name, data: compressed },
          palette: undefined,
          previews: {},
          selections: [],
          usage: undefined,
        });
        setFeedback('Imagen cargada. Pulsa “Analizar con IA” para obtener la paleta.');
      } catch (err: any) {
        alert(err?.message || 'Error procesando la imagen.');
        setFeedback('');
      } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const analyzeProject = async () => {
    if (!selectedProject) return;
    if (!geminiKey) {
      alert('Configura tu API Key de Gemini en Configuración IA para usar esta función.');
      return;
    }
    if (!selectedProject.image?.data) {
      alert('Primero sube una imagen del diseño.');
      return;
    }
    setIsAnalyzing(true);
    setFeedback('Analizando imagen con IA para detectar paleta de colores...');
    try {
      const source = selectedProject.image.data;
      const dataUrl = source.startsWith('data:') ? source : await fetchImageAsDataUrl(source);
      const result = await extractDesignPaletteWithAI(geminiKey, dataUrl, selectedProject.image.name || 'diseño');
      const palette: ProjectPaletteColor[] = (result.palette || [])
        .map((c) => ({
          hex: normalizeHex(c.hex) || c.hex,
          name: c.name || 'Color',
          weight: Number.isFinite(c.weight) ? c.weight : 0,
        }))
        .filter((c) => normalizeHex(c.hex))
        .slice(0, 10);

      if (palette.length === 0) {
        setFeedback('No se pudieron extraer colores con suficiente claridad. Prueba con otra imagen.');
        return;
      }

      setFeedback('Generando miniaturas por color para hacer la vista más visual...');
      const previewsEntries = await Promise.all(
        palette.map(async (c) => {
          const key = normalizeHex(c.hex) || c.hex;
          const thumb = await createFocusedThumbnail(dataUrl, key);
          return [key, thumb] as const;
        })
      );
      const previews = Object.fromEntries(previewsEntries.filter(([, v]) => v)) as Record<string, string>;

      updateProject({
        image: selectedProject.image ? { ...selectedProject.image, data: source } : undefined,
        palette,
        previews,
        usage: undefined,
      });
      setFeedback(result.notes ? result.notes : 'Paleta detectada. Revisa recomendaciones y marca las lanas que vas a usar.');
      setNotesDraft(selectedProject.notes || '');
    } catch (err: any) {
      alert(err?.message || 'Error al analizar la imagen con IA.');
      setFeedback('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateDimensions = (patch: Partial<ProjectDimensions>) => {
    if (!selectedProject) return;
    updateProject({
      dimensions: {
        width: Number.isFinite(dimensions.width) ? dimensions.width : 0,
        height: Number.isFinite(dimensions.height) ? dimensions.height : 0,
        unit: dimensions.unit,
        technique: dimensions.technique,
        ...patch,
      },
      usage: undefined,
    });
  };

  const calculateUsage = async () => {
    if (!selectedProject) return;
    if (!geminiKey) {
      alert('Configura tu API Key de Gemini en Configuración IA para usar esta función.');
      return;
    }
    if (!selectedProject.image?.data || !selectedProject.palette?.length) {
      alert('Necesitas una imagen y una paleta detectada antes de calcular consumo.');
      return;
    }
    if (!dimensions.width || !dimensions.height) {
      alert('Indica el tamaño (ancho y alto) del diseño.');
      return;
    }

    setIsAnalyzing(true);
    setFeedback('Calculando consumo aproximado de lana por color...');
    try {
      const source = selectedProject.image.data;
      const dataUrl = source.startsWith('data:') ? source : await fetchImageAsDataUrl(source);
      const result = await estimateYarnUsageWithAI(geminiKey, dataUrl, {
        width: dimensions.width,
        height: dimensions.height,
        unit: dimensions.unit,
        technique: dimensions.technique,
        palette: selectedProject.palette,
      });

      const gramsByHex: Record<string, number> = {};
      (result.perColor || []).forEach((item) => {
        const key = normalizeHex(item.hex);
        if (!key) return;
        gramsByHex[key] = Math.max(0, Number(item.grams) || 0);
      });

      const now = new Date().toISOString();
      updateProject({
        usage: {
          totalGrams: Math.max(0, Number(result.totalGrams) || 0),
          gramsByHex,
          createdAt: now,
        },
      });
      setFeedback(result.notes ? result.notes : 'Consumo estimado calculado. Revisa los gramos por color y ajusta si hace falta.');
    } catch (err: any) {
      alert(err?.message || 'Error al calcular consumo con IA.');
      setFeedback('');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSelectionFor = (designHex: string): ProjectSelection | null => {
    if (!selectedProject) return null;
    return selectedProject.selections.find((s) => normalizeHex(s.designHex) === normalizeHex(designHex)) || null;
  };

  const setSelection = (designHex: string, rec: Recommendation) => {
    if (!selectedProject) return;
    const cleanHex = normalizeHex(designHex) || designHex;
    const existing = selectedProject.selections.filter((s) => normalizeHex(s.designHex) !== normalizeHex(cleanHex));
    const next: ProjectSelection = {
      designHex: cleanHex,
      yarnId: rec.yarnId,
      colorCode: rec.colorCode,
      quantity: 1,
    };
    updateProject({ selections: [...existing, next] });
  };

  const updateSelectionQty = (designHex: string, qty: number) => {
    if (!selectedProject) return;
    const cleanHex = normalizeHex(designHex) || designHex;
    const nextSelections = selectedProject.selections.map((s) =>
      normalizeHex(s.designHex) === normalizeHex(cleanHex) ? { ...s, quantity: Math.max(1, Number(qty) || 1) } : s
    );
    updateProject({ selections: nextSelections });
  };

  const removeSelection = (designHex: string) => {
    if (!selectedProject) return;
    const cleanHex = normalizeHex(designHex) || designHex;
    updateProject({ selections: selectedProject.selections.filter((s) => normalizeHex(s.designHex) !== normalizeHex(cleanHex)) });
  };

  const usedYarnsSummary = useMemo(() => {
    if (!selectedProject) return [];
    return selectedProject.selections
      .map((s) => {
        const yarn = yarns.find((y) => y.id === s.yarnId);
        const color = yarn?.colors.find((c) => c.code === s.colorCode);
        const grams = selectedProject.usage?.gramsByHex?.[normalizeHex(s.designHex) || s.designHex] || 0;
        const skeins =
          yarn && yarn.weightGrams ? Math.max(0, grams) / Math.max(1, Number(yarn.weightGrams) || 1) : 0;
        return {
          key: `${s.yarnId}-${s.colorCode}`,
          yarnName: yarn?.name || 'Lana',
          brand: yarn?.brand || '',
          colorCode: s.colorCode,
          colorName: color?.name || '',
          hex: normalizeHex(color?.hex || '') || (color?.hex || ''),
          qty: s.quantity,
          inStock: (color ? getColorTotalStock(color) : 0) > 0,
          grams: Number.isFinite(grams) ? grams : 0,
          skeins: Number.isFinite(skeins) ? skeins : 0,
        };
      })
      .filter((x) => x.key);
  }, [selectedProject?.selections, yarns]);

  const costsTotal = useMemo(() => {
    return (costItems || []).reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const unitCost = Number(item.unitCost) || 0;
      return sum + Math.max(0, qty) * Math.max(0, unitCost);
    }, 0);
  }, [costItems]);

  const addCostItem = () => {
    if (!selectedProject) return;
    const name = newCostName.trim();
    if (!name) return;
    const category = newCostCategory.trim() || 'Material';
    const quantity = Math.max(0, Number(newCostQty) || 0);
    const unitCost = Math.max(0, Number(newCostUnitCost) || 0);
    const next: ProjectCostItem = {
      id: `cost-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      category,
      quantity,
      unitCost,
    };
    updateProject({ costItems: [...costItems, next] });
    setNewCostName('');
    setNewCostCategory('Material');
    setNewCostQty(1);
    setNewCostUnitCost(0);
  };

  const updateCostItem = (id: string, patch: Partial<ProjectCostItem>) => {
    if (!selectedProject) return;
    updateProject({
      costItems: costItems.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  const removeCostItem = (id: string) => {
    if (!selectedProject) return;
    updateProject({ costItems: costItems.filter((c) => c.id !== id) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Mis Proyectos</h2>
          <p className="text-xs text-gray-500 font-medium">Guarda tus diseños, detecta paletas con IA y registra las lanas usadas.</p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition"
        >
          <Plus size={14} /> Nuevo proyecto
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-3">
          {projects.length === 0 ? (
            <div className="bg-white p-10 text-center rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center space-y-3">
              <Folder size={44} className="text-gray-300 stroke-1" />
              <div className="font-bold text-gray-700 text-sm">No hay proyectos</div>
              <div className="text-xs text-gray-400 max-w-sm">Crea tu primer proyecto y sube una imagen del diseño.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => {
                const isSelected = p.id === selectedProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      setFeedback('');
                      setEditingName(false);
                      setEditNameValue('');
                      setNotesDraft(p.notes || '');
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition ${
                      isSelected ? 'bg-orange-50/50 border-orange-300 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-gray-800 truncate">{p.name}</div>
                        <div className="text-[11px] text-gray-400 mt-1">
                          {p.palette?.length ? `${p.palette.length} colores` : 'Sin análisis'} · {p.selections.length ? `${p.selections.length} elecciones` : 'Sin registro'}
                        </div>
                      </div>
                      {p.image?.data ? (
                        <img src={p.image.data} alt={p.name} className="h-10 w-10 rounded-lg object-cover border border-gray-200 shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-slate-50 border border-gray-200 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          {!selectedProject ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center space-y-3 min-h-[420px]">
              <Folder size={48} className="text-orange-300 stroke-1" />
              <div className="font-bold text-gray-700 text-sm">Selecciona un proyecto</div>
              <div className="text-xs text-gray-400 max-w-sm">Elige uno de la lista o crea un nuevo proyecto.</div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-gray-100">
              <div className="p-6 bg-slate-50/40 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="min-w-0">
                    {!editingName ? (
                      <div className="flex items-center gap-2">
                        <div className="text-xl font-extrabold text-gray-800 tracking-tight truncate">{selectedProject.name}</div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingName(true);
                            setEditNameValue(selectedProject.name);
                          }}
                          className="py-1 px-2 border border-slate-200 text-slate-600 hover:bg-white text-xs font-bold rounded-lg transition"
                        >
                          Editar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          className="w-full bg-white border border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const name = editNameValue.trim();
                            if (!name) return;
                            updateProject({ name });
                            setEditingName(false);
                            setEditNameValue('');
                          }}
                          className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingName(false);
                            setEditNameValue('');
                          }}
                          className="p-2 bg-gray-100 text-gray-700 rounded-xl border border-gray-200 hover:bg-gray-200 transition"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                    <div className="text-[11px] text-gray-500 mt-1">
                      Creado: {new Date(selectedProject.createdAt).toLocaleString('es-ES')} · Actualizado: {new Date(selectedProject.updatedAt).toLocaleString('es-ES')}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveProjects}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
                    >
                      <Save size={14} className="inline mr-1" /> Guardar
                    </button>
                    <button
                      type="button"
                      onClick={deleteProject}
                      className="py-2 px-3 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition"
                    >
                      <Trash2 size={14} className="inline mr-1" /> Eliminar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div className="md:col-span-5">
                    <div className="bg-white border border-slate-100 rounded-2xl p-3">
                      {selectedProject.image?.data ? (
                        <img src={selectedProject.image.data} alt={selectedProject.name} className="w-full h-56 object-cover rounded-xl border border-slate-100" />
                      ) : (
                        <div className="w-full h-56 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                          Sube una imagen del diseño
                        </div>
                      )}
                      <div className="mt-3 flex gap-2">
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
                        >
                          <Upload size={14} className="inline mr-1" /> Subir imagen
                        </button>
                        <button
                          type="button"
                          onClick={analyzeProject}
                          disabled={isAnalyzing}
                          className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-60"
                        >
                          <Sparkles size={14} className="inline mr-1" /> Analizar con IA
                        </button>
                      </div>
                      {!geminiKey && (
                        <div className="mt-3 text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-2 flex items-center gap-2">
                          <AlertTriangle size={14} className="shrink-0" />
                          <span>Falta configurar la API Key de Gemini en Configuración IA.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-7 space-y-3">
                    {feedback && (
                      <div className="bg-white border border-slate-100 rounded-2xl p-4 text-xs text-slate-600">
                        {feedback}
                      </div>
                    )}

                    <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-widest">Tamaño del diseño</div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                        <div className="md:col-span-4">
                          <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Ancho</label>
                          <input
                            type="number"
                            min="0"
                            value={dimensions.width || 0}
                            onChange={(e) => updateDimensions({ width: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition font-mono"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Alto</label>
                          <input
                            type="number"
                            min="0"
                            value={dimensions.height || 0}
                            onChange={(e) => updateDimensions({ height: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition font-mono"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Unidad</label>
                          <select
                            value={dimensions.unit}
                            onChange={(e) => updateDimensions({ unit: e.target.value as ProjectSizeUnit })}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition"
                          >
                            <option value="cm">cm</option>
                            <option value="mm">mm</option>
                            <option value="in">in</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_210px] gap-2 items-end">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Técnica</label>
                          <input
                            type="text"
                            value={dimensions.technique || ''}
                            onChange={(e) => updateDimensions({ technique: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition"
                            placeholder='Ej. "Tejido", "Tufting", "Crochet"'
                          />
                        </div>
                        <button
                          type="button"
                          onClick={calculateUsage}
                          disabled={isAnalyzing}
                          className="py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-60"
                        >
                          Calcular consumo (IA)
                        </button>
                      </div>
                      {selectedProject.usage?.createdAt && (
                        <div className="text-[11px] text-slate-500">
                          Total estimado: <span className="font-bold">{Math.round(selectedProject.usage.totalGrams)}</span> g · cálculo: {new Date(selectedProject.usage.createdAt).toLocaleString('es-ES')}
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-widest">Notas</div>
                      <textarea
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Apunta detalles del proyecto, medidas, puntos, etc."
                        className="w-full min-h-[90px] bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl p-3 text-sm text-gray-800 transition"
                      />
                      <button
                        type="button"
                        onClick={() => updateProject({ notes: notesDraft })}
                        className="py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition"
                      >
                        Guardar notas
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-gray-800">Colores detectados y recomendaciones</div>
                    <div className="text-[11px] text-gray-500">La miniatura se enfoca automáticamente en la zona del dibujo donde aparece el color.</div>
                  </div>
                </div>

                {!selectedProject.palette?.length ? (
                  <div className="text-center py-10 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-xs text-slate-500">
                    Sube una imagen y analiza con IA para ver la paleta y sugerencias.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recommendationsByPalette.map((row) => {
                      const selected = getSelectionFor(row.design.hex);
                      const preview = selectedProject.previews?.[row.design.hex] || '';
                      const grams = selectedProject.usage?.gramsByHex?.[row.design.hex] || 0;
                      const selectedYarn = selected ? yarns.find((y) => y.id === selected.yarnId) : null;
                      const skeins = selectedYarn ? Math.max(0, grams) / Math.max(1, Number(selectedYarn.weightGrams) || 1) : 0;

                      return (
                        <div key={row.design.hex} className="bg-white border border-slate-100 rounded-2xl p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className="w-10 h-10 rounded-full border border-slate-200 shadow-inner shrink-0"
                                style={{ backgroundColor: row.design.hex }}
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-800 truncate">
                                  {row.design.name}{' '}
                                  <span className="font-mono text-xs text-slate-500">{row.design.hex}</span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {row.shouldBuy ? 'No hay un color muy similar: puede requerir comprar.' : 'Hay colores similares en el catálogo.'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {preview ? (
                                <img src={preview} alt="Vista por color" className="h-12 w-12 rounded-xl border border-slate-200 object-cover" />
                              ) : (
                                <div className="h-12 w-12 rounded-xl border border-slate-200 bg-slate-50" />
                              )}
                              <div className="text-right">
                                <div className="text-[11px] text-slate-500 font-mono">peso {Number(row.design.weight || 0).toFixed(2)}</div>
                                {selectedProject.usage && (
                                  <div className="text-[11px] text-slate-600 font-mono">
                                    {Math.round(grams)} g{selectedYarn ? ` · ~${Math.ceil(skeins)} ovillos` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {row.suggestions.map((sug) => (
                              <div
                                key={`${row.design.hex}-${sug.yarnId}-${sug.colorCode}`}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/40"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-6 h-6 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: sug.hex }} />
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-800 truncate">
                                      {sug.brand} · {sug.yarnName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate">
                                      #{sug.colorCode} {sug.colorName} · Δ {sug.distance}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {sug.status === 'IN_STOCK' ? (
                                    <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                      En stock ({sug.stock})
                                    </div>
                                  ) : (
                                    <div className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                                      Sin stock
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setSelection(row.design.hex, sug)}
                                    className="py-1.5 px-2 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold rounded-lg transition"
                                  >
                                    Usar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {selected && (
                            <div className="mt-3 bg-white border border-slate-100 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="text-xs text-slate-600">
                                Seleccionado: <span className="font-bold">{selected.colorCode}</span> · cantidad
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={selected.quantity}
                                  onChange={(e) => updateSelectionQty(row.design.hex, Number(e.target.value))}
                                  className="w-24 bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeSelection(row.design.hex)}
                                  className="py-2 px-3 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition"
                                >
                                  Quitar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-6 space-y-3">
                <div className="text-sm font-bold text-gray-800">Registro de lanas usadas</div>
                {usedYarnsSummary.length === 0 ? (
                  <div className="text-xs text-gray-500 bg-slate-50/40 border border-slate-100 rounded-2xl p-4">
                    Aún no has marcado ninguna sugerencia como “Usar”.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {usedYarnsSummary.map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: item.hex || '#FFFFFF' }} />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {item.brand} · {item.yarnName}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              #{item.colorCode} {item.colorName}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-slate-800 font-mono">x{item.qty}</div>
                          {item.grams > 0 && (
                            <div className="text-[10px] text-slate-600 font-mono">
                              {Math.round(item.grams)} g · ~{Math.ceil(item.skeins)} ovillos
                            </div>
                          )}
                          {item.inStock ? (
                            <div className="text-[10px] font-bold text-emerald-700">Stock OK</div>
                          ) : (
                            <div className="text-[10px] font-bold text-rose-700">Sin stock</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-gray-800">Coste estimado</div>
                    <div className="text-[11px] text-gray-500">Añade telas, lana, pegamento, herramientas, etc. y calcula un total.</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-gray-500">Total</div>
                    <div className="text-lg font-extrabold text-gray-800">
                      {costsTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/40 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-5">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Concepto</label>
                      <input
                        type="text"
                        value={newCostName}
                        onChange={(e) => setNewCostName(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition"
                        placeholder='Ej. "Pegamento", "Tela base", "Ovillos extra"'
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Categoría</label>
                      <input
                        type="text"
                        value={newCostCategory}
                        onChange={(e) => setNewCostCategory(e.target.value)}
                        className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition"
                        placeholder='Ej. "Material"'
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Cantidad</label>
                      <input
                        type="number"
                        min="0"
                        value={newCostQty}
                        onChange={(e) => setNewCostQty(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition font-mono"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Coste unidad (€)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newCostUnitCost}
                        onChange={(e) => setNewCostUnitCost(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addCostItem}
                    className="py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    Añadir coste
                  </button>
                </div>

                {costItems.length === 0 ? (
                  <div className="text-xs text-gray-500 bg-slate-50/40 border border-slate-100 rounded-2xl p-4">
                    Aún no has añadido costes.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {costItems.map((item) => {
                      const subtotal = Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitCost) || 0);
                      return (
                        <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-4">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                            <div className="md:col-span-5">
                              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Concepto</label>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateCostItem(item.id, { name: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Categoría</label>
                              <input
                                type="text"
                                value={item.category}
                                onChange={(e) => updateCostItem(item.id, { category: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Cantidad</label>
                              <input
                                type="number"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => updateCostItem(item.id, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition font-mono"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Coste unidad (€)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitCost}
                                onChange={(e) => updateCostItem(item.id, { unitCost: Math.max(0, Number(e.target.value) || 0) })}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-2 px-3 text-sm text-gray-800 transition font-mono"
                              />
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="text-[11px] text-slate-500">
                              Subtotal: <span className="font-bold">{subtotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCostItem(item.id)}
                              className="py-2 px-3 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition"
                            >
                              Eliminar
                            </button>
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

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden"
            >
              <div className="bg-slate-800 p-5 text-white flex justify-between items-center">
                <div className="font-bold text-base flex items-center gap-2">
                  <Folder size={18} /> Nuevo proyecto
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-700 rounded-full transition">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:outline-none rounded-xl py-3 px-4 text-sm text-gray-800 transition"
                    placeholder='Ej. "Gorro azul invierno"'
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 px-4 border border-gray-200 text-gray-500 hover:bg-slate-50 text-xs font-bold rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={createProject}
                    className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition shadow-md"
                  >
                    Crear
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
