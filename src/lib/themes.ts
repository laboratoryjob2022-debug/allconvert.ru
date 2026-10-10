export interface ThemeOption {
  id: string;
  nameRu: string;
  nameEn: string;
  colorHex: string;
  accentHex: string;
  bgHex: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: 'studio-light',
    nameRu: 'Светлая Студия (По умолчанию)',
    nameEn: 'Light Studio (Default)',
    colorHex: '#f8fafc',
    accentHex: '#2563eb',
    bgHex: 'bg-[#f8fafc]',
  },
  {
    id: 'studio-dark',
    nameRu: 'Тёмная Студия',
    nameEn: 'Dark Studio',
    colorHex: '#070a12',
    accentHex: '#3b82f6',
    bgHex: 'bg-[#070a12]',
  },
  {
    id: 'joyful',
    nameRu: 'Радостная',
    nameEn: 'Joyful',
    colorHex: '#fffbeb',
    accentHex: '#f97316',
    bgHex: 'bg-[#fffbeb]',
  },
  {
    id: 'arctic-ice',
    nameRu: 'Арктический Лёд',
    nameEn: 'Arctic Ice',
    colorHex: '#f0f9ff',
    accentHex: '#0284c7',
    bgHex: 'bg-[#f0f9ff]',
  },
];
