import { BagStock, ColorStorage, Yarn } from '../types';

export function getColorTotalStock(color: ColorStorage): number {
  if (color.bags && color.bags.length > 0) {
    return color.bags.reduce((sum, bag) => sum + Math.max(0, Number(bag.quantity) || 0), 0);
  }

  return Number(color.stock) || 0;
}

export function normalizeBags(color: ColorStorage): BagStock[] {
  if (color.bags && color.bags.length > 0) {
    return color.bags
      .filter((bag) => bag.name.trim())
      .map((bag) => ({
        name: bag.name.trim(),
        quantity: Math.max(0, Number(bag.quantity) || 0),
      }));
  }

  return [];
}

export function normalizeColor(color: ColorStorage): ColorStorage {
  const bags = normalizeBags(color);
  const stock = bags.length > 0 ? bags.reduce((sum, bag) => sum + bag.quantity, 0) : Math.max(0, Number(color.stock) || 0);

  return {
    ...color,
    bags,
    location: bags[0]?.name || 'Sin bolsa',
    stock,
  };
}

export function normalizeYarn(yarn: Yarn): Yarn {
  return {
    ...yarn,
    colors: yarn.colors.map(normalizeColor),
  };
}

export function clearYarnStock(yarn: Yarn): Yarn {
  return {
    ...yarn,
    colors: yarn.colors.map((color) => ({
      ...color,
      stock: 0,
      bags: [],
    })),
  };
}

export function getBagNames(color: ColorStorage): string[] {
  return normalizeBags(color).map((bag) => bag.name);
}
