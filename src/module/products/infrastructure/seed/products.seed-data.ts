import {
  ProductCategory,
  ProductStatus,
} from '../../domain/entities/product.entity';

/**
 * Catálogo inicial: los 12 productos del diseño de Claude Design.
 *
 * Los precios ya están en CÉNTIMOS. `publishedDaysAgo` se convierte en una
 * fecha al ejecutar el seed: así "Nuevo" (≤ 30 días) sigue funcionando
 * aunque el seed se ejecute dentro de meses.
 */

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

/** Stock por talla a partir de una lista de cantidades en el mismo orden. */
const clothingStock = (stocks: number[]) =>
  CLOTHING_SIZES.map((size, index) => ({ size, stock: stocks[index] ?? 0 }));

const COLORS = {
  camel: { name: 'Camel', hex: '#c8a06a' },
  crudo: { name: 'Crudo', hex: '#ece3d3' },
  tierra: { name: 'Tierra', hex: '#8a6a4a' },
  terracota: { name: 'Terracota', hex: '#c25e3a' },
  arena: { name: 'Arena', hex: '#d8c4a8' },
  cuero: { name: 'Cuero', hex: '#7a5230' },
};

export interface ProductSeed {
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  category: ProductCategory;
  type: string;
  color: { name: string; hex: string };
  sizes: { size: string; stock: number }[];
  rating: number;
  reviewsCount: number;
  isFeatured: boolean;
  status: ProductStatus;
  publishedDaysAgo: number;
}

export const PRODUCTS_SEED: ProductSeed[] = [
  {
    slug: 'abrigo-de-lana',
    name: 'Abrigo de lana',
    description:
      'Abrigo largo de lana virgen con corte recto y solapa clásica. Cálido, ligero y pensado para durar muchos inviernos.',
    price: 18900,
    compareAtPrice: 24000,
    category: ProductCategory.WOMEN,
    type: 'Abrigos',
    color: COLORS.camel,
    sizes: clothingStock([2, 5, 0, 3, 1]),
    rating: 4.8,
    reviewsCount: 128,
    isFeatured: true,
    status: ProductStatus.ACTIVE,
    publishedDaysAgo: 90,
  },
  {
    slug: 'camisa-de-lino',
    name: 'Camisa de lino',
    description:
      'Camisa de lino lavado, fresca y transpirable. Holgada, con botones de nácar.',
    price: 5900,
    compareAtPrice: null,
    category: ProductCategory.WOMEN,
    type: 'Camisas',
    color: COLORS.crudo,
    sizes: clothingStock([4, 6, 6, 3, 2]),
    rating: 4.6,
    reviewsCount: 64,
    isFeatured: false,
    status: ProductStatus.ACTIVE,
    publishedDaysAgo: 75,
  },
  {
    slug: 'pantalon-sastre',
    name: 'Pantalón sastre',
    description:
      'Pantalón de pinzas en mezcla de lana. Tiro alto y pierna recta para un look atemporal.',
    price: 8900,
    compareAtPrice: null,
    category: ProductCategory.MEN,
    type: 'Pantalones',
    color: COLORS.tierra,
    sizes: clothingStock([0, 3, 5, 4, 2]),
    rating: 4.7,
    reviewsCount: 90,
    isFeatured: false,
    status: ProductStatus.ACTIVE,
    publishedDaysAgo: 120,
  },
  {
    slug: 'jersey-de-punto',
    name: 'Jersey de punto',
    description:
      'Jersey de punto grueso en lana merino. Cuello redondo y puños acanalados.',
    price: 7500,
    compareAtPrice: null,
    category: ProductCategory.WOMEN,
    type: 'Punto',
    color: COLORS.terracota,
    sizes: clothingStock([3, 4, 4, 2, 1]),
    rating: 4.9,
    reviewsCount: 201,
    isFeatured: true,
    status: ProductStatus.ACTIVE,
    publishedDaysAgo: 5,
  },
  {
    slug: 'vestido-midi',
    name: 'Vestido midi',
    description:
      'Vestido midi de viscosa con caída fluida, escote en pico y cinturón a juego.',
    price: 11900,
    compareAtPrice: null,
    category: ProductCategory.WOMEN,
    type: 'Vestidos',
    color: COLORS.arena,
    sizes: clothingStock([1, 3, 2, 0, 0]),
    rating: 4.5,
    reviewsCount: 47,
    isFeatured: false,
    status: ProductStatus.ACTIVE,
    publishedDaysAgo: 60,
  },
  {
    slug: 'gabardina-clasica',
    name: 'Gabardina clásica',
    description:
      'Gabardina cruzada de algodón con tratamiento repelente al agua y cinturón.',
    price: 15900,
    compareAtPrice: 19900,
    category: ProductCategory.MEN,
    type: 'Abrigos',
    color: COLORS.camel,
    sizes: clothingStock([0, 2, 4, 3, 1]),
    rating: 4.8,
    reviewsCount: 73,
    isFeatured: true,
    status: ProductStatus.ACTIVE,
    publishedDaysAgo: 100,
  },
  {
    slug: 'bolso-de-piel',
    name: 'Bolso de piel',
    description:
      'Bolso de hombro en piel curtida vegetal, con cierre magnético y bolsillo interior.',
    price: 13500,
    compareAtPrice: null,
    category: ProductCategory.ACCESSORIES,
    type: 'Bolsos',
    color: COLORS.cuero,
    sizes: [{ size: 'ÚNICA', stock: 8 }],
    rating: 4.7,
    reviewsCount: 156,
    isFeatured: false,
    status: ProductStatus.ACTIVE,
    publishedDaysAgo: 80,
  },
  {
    slug: 'botines-de-cuero',
    name: 'Botines de cuero',
    description:
      'Botines Chelsea de cuero con elásticos laterales y suela de goma antideslizante.',
    price: 14500,
    compareAtPrice: null,
    category: ProductCategory.ACCESSORIES,
    type: 'Zapatos',
    color: COLORS.cuero,
    // Los zapatos usan numeración, no XS–XL: el modelo de tallas lo permite
    sizes: ['37', '38', '39', '40', '41'].map((size, index) => ({
      size,
      stock: [1, 3, 4, 2, 0][index],
    })),
    rating: 4.9,
    reviewsCount: 88,
    isFeatured: true,
    status: ProductStatus.ACTIVE,
    publishedDaysAgo: 3,
  },
  {
    slug: 'camiseta-esencial',
    name: 'Camiseta esencial',
    description:
      'Camiseta de algodón orgánico de gramaje medio. El básico que combina con todo.',
    price: 2900,
    compareAtPrice: null,
    category: ProductCategory.MEN,
    type: 'Camisetas',
    color: COLORS.crudo,
    sizes: clothingStock([5, 10, 12, 8, 4]),
    rating: 4.4,
    reviewsCount: 312,
    isFeatured: false,
    status: ProductStatus.ACTIVE,
    publishedDaysAgo: 20,
  },
  {
    slug: 'falda-plisada',
    name: 'Falda plisada',
    description:
      'Falda midi plisada con cintura elástica. Se mueve contigo y no se arruga.',
    price: 6900,
    compareAtPrice: null,
    category: ProductCategory.WOMEN,
    type: 'Faldas',
    color: COLORS.arena,
    sizes: clothingStock([2, 3, 3, 1, 0]),
    rating: 4.6,
    reviewsCount: 54,
    isFeatured: false,
    status: ProductStatus.ACTIVE,
    publishedDaysAgo: 25,
  },
  {
    slug: 'chaqueta-de-ante',
    name: 'Chaqueta de ante',
    description:
      'Chaqueta de ante suave con cremallera metálica y bolsillos de parche.',
    price: 21500,
    compareAtPrice: 26900,
    category: ProductCategory.MEN,
    type: 'Chaquetas',
    color: COLORS.tierra,
    sizes: clothingStock([0, 1, 2, 2, 1]),
    rating: 4.8,
    reviewsCount: 39,
    isFeatured: false,
    status: ProductStatus.ACTIVE,
    publishedDaysAgo: 10,
  },
  {
    slug: 'bufanda-de-lana',
    name: 'Bufanda de lana',
    description:
      'Bufanda amplia de lana con flecos. Abriga sin pesar y se lleva de mil maneras.',
    price: 4500,
    compareAtPrice: null,
    category: ProductCategory.ACCESSORIES,
    type: 'Bufandas',
    color: COLORS.terracota,
    sizes: [{ size: 'ÚNICA', stock: 15 }],
    rating: 4.7,
    reviewsCount: 121,
    isFeatured: false,
    status: ProductStatus.ACTIVE,
    publishedDaysAgo: 15,
  },
];
