import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Reads the real token file so changing a brand colour re-runs these checks.
const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');
const token = (name: string) => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token ${name} not found`);
  return m[1]!;
};
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

// [foreground, background, minimum ratio, usage]
const pairs: [string, string, number, string][] = [
  ['text-primary', 'surface', 4.5, 'body text'],
  ['text-secondary', 'surface', 4.5, 'secondary text'],
  ['text-secondary', 'background-light', 4.5, 'secondary text on light sections'],
  ['text-inverse', 'primary-strong', 4.5, 'primary button label'],
  ['text-inverse', 'primary-hover', 4.5, 'primary button hover'],
  ['primary-strong', 'surface', 4.5, 'links'],
  ['primary-on-highlight', 'highlight', 4.5, 'text on highlight'],
  ['secondary-strong', 'surface', 4.5, 'teal text'],
  ['text-on-dark', 'background-dark', 4.5, 'text on navy'],
  ['text-on-dark-muted', 'background-dark', 4.5, 'muted text on navy'],
  ['text-on-dark-muted', 'background-secondary', 4.5, 'muted text on secondary navy'],
  ['primary-soft', 'background-dark', 4.5, 'links on navy'],
  ['secondary-soft', 'background-dark', 4.5, 'teal on navy'],
  ['status-live', 'status-live-bg', 4.5, 'Live badge'],
  ['status-planned', 'status-planned-bg', 4.5, 'Planned badge'],
  ['status-tba', 'status-tba-bg', 4.5, 'TBA badge'],
  ['danger', 'surface', 4.5, 'error text'],
  ['danger', 'danger-bg', 4.5, 'error banner'],
  ['success', 'success-bg', 4.5, 'success banner'],
  ['review', 'review-bg', 4.5, 'review marker'],
  ['border', 'surface', 1.0, 'decorative border (no requirement)'],
  ['primary-strong', 'surface', 3, 'focus ring (non-text 3:1)'],
  ['primary-soft', 'background-dark', 3, 'focus ring on dark (non-text 3:1)'],
];

describe('design token contrast (WCAG 2.2 AA)', () => {
  it.each(pairs)('%s on %s ≥ %s (%s)', (fg, bg, min) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(min);
  });

  it('documents that raw brand primary is not used for small text on white', () => {
    // #3B82F6 on white is below 4.5:1, which is why primary-strong exists.
    expect(ratio(token('primary'), token('surface'))).toBeLessThan(4.5);
  });
});
