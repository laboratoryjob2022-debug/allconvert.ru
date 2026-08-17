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
    nameRu: 'Светлая Студия Про (По умолчанию)',
    nameEn: 'Light Studio Pro (Default)',
    colorHex: '#f8fafc',
    accentHex: '#2563eb',
    bgHex: 'bg-[#f8fafc]',
  },
  {
    id: 'studio-dark',
    nameRu: 'Тёмная Студия',
    nameEn: 'Dark Studio',
    colorHex: '#070a12',
    accentHex: '#22d3ee',
    bgHex: 'bg-[#070a12]',
  },
  {
    id: 'joyful',
    nameRu: 'Радостная / Яркая',
    nameEn: 'Joyful / Vibrant',
    colorHex: '#fffbeb',
    accentHex: '#f97316',
    bgHex: 'bg-[#fffbeb]',
  },
  {
    id: 'arctic-ice',
    nameRu: 'Арктический Лёд (Светлая)',
    nameEn: 'Arctic Ice (Light)',
    colorHex: '#f0f9ff',
    accentHex: '#0284c7',
    bgHex: 'bg-[#f0f9ff]',
  },
  {
    id: 'warm-sand',
    nameRu: 'Тёплый Песок (Светлая)',
    nameEn: 'Warm Sand (Light)',
    colorHex: '#fdfbf7',
    accentHex: '#d97706',
    bgHex: 'bg-[#fdfbf7]',
  },
  {
    id: 'emerald-mint',
    nameRu: 'Мятный Свет (Светлая)',
    nameEn: 'Mint Light (Light)',
    colorHex: '#f0fdf4',
    accentHex: '#059669',
    bgHex: 'bg-[#f0fdf4]',
  },
  {
    id: 'elite-gold',
    nameRu: 'Элитное Золото (Luxury)',
    nameEn: 'Elite Gold (Luxury)',
    colorHex: '#0a0908',
    accentHex: '#f59e0b',
    bgHex: 'bg-[#0a0908]',
  },
  {
    id: 'cyberpunk',
    nameRu: 'Киберпанк 2077 (Неон)',
    nameEn: 'Cyberpunk (Neon)',
    colorHex: '#0d0221',
    accentHex: '#a3e635',
    bgHex: 'bg-[#0d0221]',
  },
  {
    id: 'emerald-zen',
    nameRu: 'Изумрудный Дзен (Лес)',
    nameEn: 'Emerald Zen (Forest)',
    colorHex: '#051812',
    accentHex: '#34d399',
    bgHex: 'bg-[#051812]',
  },
  {
    id: 'nord-frost',
    nameRu: 'Северный Мороз (Nord)',
    nameEn: 'Nord Frost (Arctic)',
    colorHex: '#2e3440',
    accentHex: '#67e8f9',
    bgHex: 'bg-[#2e3440]',
  },
  {
    id: 'midnight-blue',
    nameRu: 'Полночный Синий (Сапфир)',
    nameEn: 'Midnight Blue (Sapphire)',
    colorHex: '#030b1e',
    accentHex: '#60a5fa',
    bgHex: 'bg-[#030b1e]',
  },
  {
    id: 'sunset-glow',
    nameRu: 'Закат / Сумерки (Sunset)',
    nameEn: 'Sunset Glow (Twilight)',
    colorHex: '#1a0b1c',
    accentHex: '#fb923c',
    bgHex: 'bg-[#1a0b1c]',
  },
  {
    id: 'monochrome',
    nameRu: 'Монохромный Минимал',
    nameEn: 'Monochrome Clean',
    colorHex: '#121212',
    accentHex: '#ffffff',
    bgHex: 'bg-[#121212]',
  },
];
