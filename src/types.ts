/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ColorStorage {
  code: string;
  name: string;
  hex: string;
  stock: number;
  minStock: number;
  location: string;
  sku: string;
  bags?: BagStock[];
}

export interface BagStock {
  name: string;
  quantity: number;
}

export interface Bag {
  name: string;
  location: string;
  createdAt: string;
}

export interface PurchaseLink {
  name: string;
  url: string;
}

export interface ProjectPaletteColor {
  hex: string;
  name: string;
  weight: number;
}

export interface ProjectSelection {
  designHex: string;
  yarnId: string;
  colorCode: string;
  quantity: number;
}

export type ProjectSizeUnit = 'cm' | 'mm' | 'in';

export interface ProjectDimensions {
  width: number;
  height: number;
  unit: ProjectSizeUnit;
  technique: string;
}

export interface ProjectCostItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitCost: number;
}

export interface ProjectUsageEstimation {
  totalGrams: number;
  gramsByHex: Record<string, number>;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  image?: { name: string; data: string };
  imagePath?: string;
  palette?: ProjectPaletteColor[];
  selections: ProjectSelection[];
  previews?: Record<string, string>;
  dimensions?: ProjectDimensions;
  costItems?: ProjectCostItem[];
  usage?: ProjectUsageEstimation;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Yarn {
  id: string;
  name: string;
  brand: string;
  composition: string;
  weightGrams: number;
  lengthMeters: number;
  price: number;
  supplier: string;
  image?: string;
  imagePath?: string;
  purchaseLinks?: PurchaseLink[];
  catalogPdf?: {
    name: string;
    data: string; // base64
  };
  colors: ColorStorage[];
  notes?: string;
  createdAt: string;
}

export type MovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

export interface Movement {
  id: string;
  yarnId: string;
  yarnName: string;
  yarnBrand: string;
  colorCode: string;
  colorName: string;
  sku: string;
  type: MovementType;
  quantity: number; // positive for entries, negative or positive depending on context (let's store absolute quantity and determine sign by type)
  reason: string; // "Compra", "Venta", "Muestra", "Dañado", "Corrección inventario", etc.
  date: string;
  user: string;
  notes?: string;
}

export type RemainingPercent = 100 | 75 | 50 | 25;

export interface StartedSkein {
  id: string;
  yarnId: string;
  yarnName: string;
  yarnBrand: string;
  colorCode: string;
  colorName: string;
  colorHex: string;
  sku: string;
  remainingPercent: RemainingPercent;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  username: string;
  role: 'admin' | 'staff';
  name: string;
}

export interface DatabaseBackup {
  yarns: Yarn[];
  movements: Movement[];
  accounts: { username: string; name: string; role: string; passwordHash: string }[];
  version: string;
  exportDate: string;
}
