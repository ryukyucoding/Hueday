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
