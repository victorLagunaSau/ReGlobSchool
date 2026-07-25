import type { CSSProperties } from 'react';

// Intensidad de verde proporcional al score, igual que la columna
// "Posibilidad" de la hoja de cálculo de seguimiento de escuelas.
export function scoreStyle(percent: number): CSSProperties {
  const intensity = Math.max(0, Math.min(percent, 100)) / 100;
  return {
    backgroundColor: `rgba(16, 185, 129, ${0.15 + intensity * 0.65})`,
    color: intensity > 0.55 ? '#ffffff' : '#065f46',
  };
}
