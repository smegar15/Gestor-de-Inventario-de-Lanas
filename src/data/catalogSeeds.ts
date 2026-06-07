/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Yarn } from '../types';

export const KATIA_PLANET_SEED: Yarn = {
  id: 'yarn-katia-planet',
  name: 'Planet',
  brand: 'Katia',
  composition: '100% Acrílico',
  weightGrams: 100,
  lengthMeters: 200,
  price: 2.95,
  supplier: 'Katia S.A.',
  notes: 'Lana básica acrílica muy suave de gran rendimiento, ideal para tejer todo tipo de prendas, mantas y accesorios.',
  createdAt: '2026-01-10T12:00:00Z',
  colors: [
    { code: '3967', name: 'Marrón Oscuro', hex: '#4E3629', stock: 15, minStock: 5, location: 'Estantería A-1', sku: 'KAT-PLAN-3967' },
    { code: '3972', name: 'Burdeos', hex: '#5C061E', stock: 8, minStock: 5, location: 'Estantería A-1', sku: 'KAT-PLAN-3972' },
    { code: '3971', name: 'Rojo', hex: '#C40C30', stock: 25, minStock: 10, location: 'Estantería A-1', sku: 'KAT-PLAN-3971' },
    { code: '3970', name: 'Coral', hex: '#E1575F', stock: 12, minStock: 5, location: 'Estantería A-2', sku: 'KAT-PLAN-3970' },
    { code: '4024', name: 'Rosa Chicle', hex: '#E75480', stock: 4, minStock: 8, location: 'Estantería A-2', sku: 'KAT-PLAN-4024' }, // LOW STOCK
    { code: '3985', name: 'Teja', hex: '#B83C25', stock: 18, minStock: 5, location: 'Estantería A-2', sku: 'KAT-PLAN-3985' },
    { code: '4016', name: 'Óxido', hex: '#8B4513', stock: 9, minStock: 5, location: 'Estantería A-3', sku: 'KAT-PLAN-4016' },
    { code: '4022', name: 'Melocotón', hex: '#FF9E80', stock: 3, minStock: 5, location: 'Estantería A-3', sku: 'KAT-PLAN-4022' }, // LOW STOCK
    { code: '3987', name: 'Ocre Mostaza', hex: '#D4A373', stock: 21, minStock: 10, location: 'Estantería A-3', sku: 'KAT-PLAN-3987' },
    { code: '4001', name: 'Amarillo Piña', hex: '#FFD166', stock: 11, minStock: 5, location: 'Estantería A-3', sku: 'KAT-PLAN-4001' },
    { code: '3978', name: 'Amarillo Claro', hex: '#FFE066', stock: 7, minStock: 5, location: 'Estantería A-4', sku: 'KAT-PLAN-3978' },
    { code: '4023', name: 'Morado Oscuro', hex: '#5E35B1', stock: 14, minStock: 5, location: 'Estantería B-1', sku: 'KAT-PLAN-4023' },
    { code: '3991', name: 'Malva Violeta', hex: '#9E7BB5', stock: 8, minStock: 5, location: 'Estantería B-1', sku: 'KAT-PLAN-3991' },
    { code: '3998', name: 'Fucsia Oscuro', hex: '#D81B60', stock: 2, minStock: 5, location: 'Estantería B-1', sku: 'KAT-PLAN-3998' }, // LOW STOCK
    { code: '4025', name: 'Rosa Pastel', hex: '#F8BBD0', stock: 16, minStock: 8, location: 'Estantería B-2', sku: 'KAT-PLAN-4025' },
    { code: '4007', name: 'Lila Suave', hex: '#E1BEE7', stock: 10, minStock: 5, location: 'Estantería B-2', sku: 'KAT-PLAN-4007' },
    { code: '4017', name: 'Rosa Viejo', hex: '#C2185B', stock: 5, minStock: 5, location: 'Estantería B-2', sku: 'KAT-PLAN-4017' },
    { code: '3999', name: 'Gris Lavanda', hex: '#B0BEC5', stock: 12, minStock: 5, location: 'Estantería B-3', sku: 'KAT-PLAN-3999' },
    { code: '4026', name: 'Crudo', hex: '#F5F5DC', stock: 35, minStock: 15, location: 'Estantería B-3', sku: 'KAT-PLAN-4026' },
    { code: '3961', name: 'Beis', hex: '#D7CCC8', stock: 22, minStock: 10, location: 'Estantería B-3', sku: 'KAT-PLAN-3961' },
    { code: '3951', name: 'Blanco Roto', hex: '#ECEFF1', stock: 40, minStock: 15, location: 'Estantería B-4', sku: 'KAT-PLAN-3951' },
    { code: '3950', name: 'Blanco', hex: '#FFFFFF', stock: 45, minStock: 15, location: 'Estantería B-4', sku: 'KAT-PLAN-3950' },
    { code: '3988', name: 'Taupe', hex: '#4E4D4A', stock: 14, minStock: 5, location: 'Estantería C-1', sku: 'KAT-PLAN-3988' },
    { code: '3989', name: 'Beis Claro', hex: '#F5F5DC', stock: 8, minStock: 5, location: 'Estantería C-1', sku: 'KAT-PLAN-3989' },
    { code: '4021', name: 'Pistacho Fuerte', hex: '#CDDC39', stock: 10, minStock: 5, location: 'Estantería C-1', sku: 'KAT-PLAN-4021' },
    { code: '3983', name: 'Verde Oliva', hex: '#6B8E23', stock: 13, minStock: 5, location: 'Estantería C-2', sku: 'KAT-PLAN-3983' },
    { code: '3966', name: 'Verde Pistacho', hex: '#4CAF50', stock: 7, minStock: 5, location: 'Estantería C-2', sku: 'KAT-PLAN-3966' },
    { code: '4020', name: 'Verde Militar', hex: '#556B2F', stock: 1, minStock: 5, location: 'Estantería C-2', sku: 'KAT-PLAN-4020' }, // LOW STOCK
    { code: '3980', name: 'Kaki', hex: '#8FBC8F', stock: 10, minStock: 5, location: 'Estantería C-3', sku: 'KAT-PLAN-3980' },
    { code: '4011', name: 'Verde Pino', hex: '#1B5E20', stock: 19, minStock: 5, location: 'Estantería C-3', sku: 'KAT-PLAN-4011' },
    { code: '4015', name: 'Verde Seco', hex: '#81C784', stock: 12, minStock: 5, location: 'Estantería C-3', sku: 'KAT-PLAN-4015' },
    { code: '4000', name: 'Turquesa', hex: '#00ACC1', stock: 24, minStock: 10, location: 'Estantería C-4', sku: 'KAT-PLAN-4000' },
    { code: '4005', name: 'Turquesa Claro', hex: '#80DEEA', stock: 18, minStock: 5, location: 'Estantería C-4', sku: 'KAT-PLAN-4005' },
    { code: '3993', name: 'Gris Pizarra', hex: '#455A64', stock: 15, minStock: 5, location: 'Estantería D-1', sku: 'KAT-PLAN-3993' },
    { code: '3995', name: 'Azul Tejano', hex: '#5C6BC0', stock: 22, minStock: 8, location: 'Estantería D-1', sku: 'KAT-PLAN-3995' },
    { code: '3977', name: 'Celeste', hex: '#90CAF9', stock: 30, minStock: 10, location: 'Estantería D-1', sku: 'KAT-PLAN-3977' },
    { code: '4009', name: 'Azul Bebé', hex: '#E3F2FD', stock: 25, minStock: 10, location: 'Estantería D-2', sku: 'KAT-PLAN-4009' },
    { code: '3975', name: 'Gris Medio', hex: '#90A4AE', stock: 16, minStock: 5, location: 'Estantería D-2', sku: 'KAT-PLAN-3975' },
    { code: '3984', name: 'Gris Mezcla', hex: '#78909C', stock: 14, minStock: 5, location: 'Estantería D-2', sku: 'KAT-PLAN-3984' },
    { code: '4006', name: 'Gris Marengo', hex: '#37474F', stock: 11, minStock: 5, location: 'Estantería D-3', sku: 'KAT-PLAN-4006' },
    { code: '3974', name: 'Negro', hex: '#121212', stock: 50, minStock: 15, location: 'Estantería D-3', sku: 'KAT-PLAN-3974' },
    { code: '3973', name: 'Azul Marino', hex: '#1A237E', stock: 38, minStock: 15, location: 'Estantería D-3', sku: 'KAT-PLAN-3973' },
    { code: '4014', name: 'Azulón', hex: '#0D47A1', stock: 27, minStock: 8, location: 'Estantería D-4', sku: 'KAT-PLAN-4014' },
    { code: '3982', name: 'Azul Rey', hex: '#1E88E5', stock: 18, minStock: 5, location: 'Estantería D-4', sku: 'KAT-PLAN-3982' },
    { code: '4010', name: 'Verde Botella', hex: '#004D40', stock: 23, minStock: 10, location: 'Estantería D-4', sku: 'KAT-PLAN-4010' }
  ]
};

export const KATIA_CRAFT_LOVER_SEED: Yarn = {
  id: 'yarn-katia-craft-lover',
  name: 'Craft Lover',
  brand: 'Katia',
  composition: '70% Acrílico, 30% Lana',
  weightGrams: 50,
  lengthMeters: 133,
  price: 3.50,
  supplier: 'Katia S.A.',
  notes: 'Lana súper suave y abrigada compuesta por mezcla de acrílico y lana, perfecta para manualidades de tufting y prendas cálidas.',
  createdAt: '2026-02-15T15:30:00Z',
  colors: [
    { code: '6', name: 'Gris Taupe', hex: '#8B8589', stock: 22, minStock: 8, location: 'Estantería E-1', sku: 'KAT-CRAF-0006' },
    { code: '28', name: 'Marrón Camel', hex: '#C19A6B', stock: 15, minStock: 8, location: 'Estantería E-1', sku: 'KAT-CRAF-0028' },
    { code: '4', name: 'Rojo Sangre', hex: '#960018', stock: 3, minStock: 10, location: 'Estantería E-1', sku: 'KAT-CRAF-0004' }, // LOW STOCK
    { code: '29', name: 'Guinda', hex: '#701C1C', stock: 11, minStock: 5, location: 'Estantería E-2', sku: 'KAT-CRAF-0029' },
    { code: '26', name: 'Fucsia', hex: '#FF007F', stock: 9, minStock: 5, location: 'Estantería E-2', sku: 'KAT-CRAF-0026' },
    { code: '20', name: 'Magenta', hex: '#CA1F7B', stock: 5, minStock: 5, location: 'Estantería E-2', sku: 'KAT-CRAF-0020' },
    { code: '13', name: 'Violeta Oscuro', hex: '#3F224C', stock: 14, minStock: 5, location: 'Estantería E-3', sku: 'KAT-CRAF-0013' },
    { code: '12', name: 'Mostaza Apagado', hex: '#B57C1E', stock: 20, minStock: 8, location: 'Estantería E-3', sku: 'KAT-CRAF-0012' },
    { code: '23', name: 'Siena Tostado', hex: '#8B5A2B', stock: 8, minStock: 5, location: 'Estantería E-3', sku: 'KAT-CRAF-0023' },
    { code: '3', name: 'Arena', hex: '#E5D3B3', stock: 32, minStock: 10, location: 'Estantería E-4', sku: 'KAT-CRAF-0003' },
    { code: '8', name: 'Crudo Rosado', hex: '#F4E0E2', stock: 12, minStock: 5, location: 'Estantería E-4', sku: 'KAT-CRAF-0008' },
    { code: '7', name: 'Crudo Melón', hex: '#FAECD8', stock: 18, minStock: 5, location: 'Estantería E-4', sku: 'KAT-CRAF-0007' },
    { code: '21', name: 'Rosa Tarta', hex: '#FFC0CB', stock: 4, minStock: 8, location: 'Estantería F-1', sku: 'KAT-CRAF-0021' }, // LOW STOCK
    { code: '22', name: 'Rosa Dulce', hex: '#FFB7C5', stock: 16, minStock: 8, location: 'Estantería F-1', sku: 'KAT-CRAF-0022' },
    { code: '16', name: 'Esmeralda', hex: '#097969', stock: 10, minStock: 5, location: 'Estantería F-1', sku: 'KAT-CRAF-0016' },
    { code: '11', name: 'Verde Oliva Seco', hex: '#556B2F', stock: 12, minStock: 5, location: 'Estantería F-2', sku: 'KAT-CRAF-0011' },
    { code: '25', name: 'Verde Menta', hex: '#98FF98', stock: 19, minStock: 8, location: 'Estantería F-2', sku: 'KAT-CRAF-0025' },
    { code: '17', name: 'Azul Ceniza', hex: '#A7BCC7', stock: 8, minStock: 5, location: 'Estantería F-2', sku: 'KAT-CRAF-0017' },
    { code: '1', name: 'Blanco Nieve', hex: '#FFFFFF', stock: 45, minStock: 15, location: 'Estantería F-3', sku: 'KAT-CRAF-0001' },
    { code: '9', name: 'Gris Perla', hex: '#D3D3D3', stock: 24, minStock: 10, location: 'Estantería F-3', sku: 'KAT-CRAF-0009' },
    { code: '10', name: 'Gris Plomo', hex: '#708090', stock: 15, minStock: 5, location: 'Estantería F-3', sku: 'KAT-CRAF-0010' },
    { code: '2', name: 'Negro Antracita', hex: '#2C3539', stock: 30, minStock: 10, location: 'Estantería F-4', sku: 'KAT-CRAF-0002' },
    { code: '5', name: 'Azul Marino Noche', hex: '#0F1E36', stock: 21, minStock: 10, location: 'Estantería F-4', sku: 'KAT-CRAF-0005' },
    { code: '27', name: 'Azul Cobalto', hex: '#0047AB', stock: 13, minStock: 5, location: 'Estantería F-4', sku: 'KAT-CRAF-0027' },
    { code: '14', name: 'Azul Denim', hex: '#4B6F96', stock: 17, minStock: 5, location: 'Estantería G-1', sku: 'KAT-CRAF-0014' },
    { code: '15', name: 'Azul Celeste Claro', hex: '#B0E0E6', stock: 22, minStock: 10, location: 'Estantería G-1', sku: 'KAT-CRAF-0015' },
    { code: '18', name: 'Malva Pálido', hex: '#E6E6FA', stock: 9, minStock: 5, location: 'Estantería G-1', sku: 'KAT-CRAF-0018' },
    { code: '19', name: 'Violeta Medio', hex: '#8A2BE2', stock: 6, minStock: 5, location: 'Estantería G-2', sku: 'KAT-CRAF-0019' }
  ]
};

export const INITIAL_MOVEMENTS_SEED = (planetId: string, craftId: string) => [
  {
    id: 'mov-1',
    yarnId: planetId,
    yarnName: 'Planet',
    yarnBrand: 'Katia',
    colorCode: '3971',
    colorName: 'Rojo',
    sku: 'KAT-PLAN-3971',
    type: 'ENTRADA' as const,
    quantity: 25,
    reason: 'Compra inicial',
    date: '2026-06-01T10:00:00Z',
    user: 'admin',
    notes: 'Primer lote de Planet Rojo del proveedor'
  },
  {
    id: 'mov-2',
    yarnId: planetId,
    yarnName: 'Planet',
    yarnBrand: 'Katia',
    colorCode: '4024',
    colorName: 'Rosa Chicle',
    sku: 'KAT-PLAN-4024',
    type: 'SALIDA' as const,
    quantity: 6,
    reason: 'Venta',
    date: '2026-06-03T14:30:00Z',
    user: 'admin',
    notes: 'Vendedor cliente habitual Carmen'
  },
  {
    id: 'mov-3',
    yarnId: craftId,
    yarnName: 'Craft Lover',
    yarnBrand: 'Katia',
    colorCode: '4',
    colorName: 'Rojo Sangre',
    sku: 'KAT-CRAF-0004',
    type: 'AJUSTE' as const,
    quantity: -2,
    reason: 'Corrección por inventario',
    date: '2026-06-05T09:15:00Z',
    user: 'staff1',
    notes: 'Pérdida por muestra de exhibición deteriorada'
  }
];
