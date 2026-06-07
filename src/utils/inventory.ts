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

  if ((Number(color.stock) || 0) > 0) {
    return [
      {
        name: color.location || 'Bolsa principal',
        quantity: Number(color.stock) || 0,
      },
    ];
  }

  return [];
}

export function normalizeColor(color: ColorStorage): ColorStorage {
  const bags = normalizeBags(color);

  return {
    ...color,
    bags,
    location: bags[0]?.name || color.location || 'Sin bolsa',
    stock: bags.reduce((sum, bag) => sum + bag.quantity, 0),
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
