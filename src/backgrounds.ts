import type { BackgroundOption } from './types'

export const PRESET_BACKGROUNDS: BackgroundOption[] = [
  { id: 'dark', name: 'Midnight', kind: 'color', value: '#0f1115' },
  { id: 'slate', name: 'Slate', kind: 'color', value: '#1e2233' },
  { id: 'forest', name: 'Forest', kind: 'gradient', value: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' },
  { id: 'sunset', name: 'Sunset', kind: 'gradient', value: 'linear-gradient(135deg, #ff512f, #dd2476)' },
  { id: 'ocean', name: 'Ocean', kind: 'gradient', value: 'linear-gradient(135deg, #2b5876, #4e4376)' },
  { id: 'lofi', name: 'Lo-fi Purple', kind: 'gradient', value: 'linear-gradient(135deg, #232526, #414345)' },
]
