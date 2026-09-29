export const HUE_GROUPS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'neutral'] as const
export type HueGroup = (typeof HUE_GROUPS)[number]

export const HUE_GROUP_LABELS: Record<HueGroup, string> = {
  red: '紅',
  orange: '橘',
  yellow: '黃',
  green: '綠',
  blue: '藍',
  purple: '紫',
  pink: '粉',
  brown: '棕',
  neutral: '黑白灰'
}

/** 各色相群組的代表色（圖表、圖例用） */
export const HUE_GROUP_COLORS: Record<HueGroup, string> = {
  red: '#D9453A',
  orange: '#F08A3C',
  yellow: '#F2C641',
  green: '#5E9E6B',
  blue: '#4A7FC1',
  purple: '#8B63B3',
  pink: '#EC8FB0',
  brown: '#8A5A3B',
  neutral: '#A9A59E'
}
