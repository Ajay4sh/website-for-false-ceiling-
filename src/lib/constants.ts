// Built-in illustrations shown when an item has no photo yet.
export const ART = [
  'cove', 'round', 'wood', 'grid', 'baffle', 'pvc',
  'panel', 'louver', 'acoustic', 'wallpaper', 'partition', 'glass', 'paint', 'moulding',
] as const;

// Service categories, in display order. A category with no visible services is hidden everywhere.
export const CATEGORIES = ['Ceilings', 'Walls', 'Partitions', 'Finishes'] as const;
export type Category = (typeof CATEGORIES)[number];

// Header dropdown menus: which categories each menu contains.
export const MENUS: { label: string; categories: Category[] }[] = [
  { label: 'Ceilings', categories: ['Ceilings'] },
  { label: 'Walls & Partitions', categories: ['Walls', 'Partitions', 'Finishes'] },
];
