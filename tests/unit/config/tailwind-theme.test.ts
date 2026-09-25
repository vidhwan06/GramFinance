import { describe, it, expect } from 'vitest';
import tailwindConfig from '@/tailwind.config';

/**
 * Guards the Tailwind theme against malformed colour values.
 *
 * The theme shipped with `warning.50: '#fffbe finished'`. Because Tailwind only
 * emits a utility when a class is actually used, nothing failed at build time —
 * the class simply produced broken CSS the first time someone reached for
 * `bg-warning-50`. A plain typo is invisible; a typo in a colour token is not.
 */

type ColorTree = string | { [shade: string]: ColorTree };

const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const CSS_VAR = /^var\(--[\w-]+\)$/;

function collectColorValues(node: unknown, path: string, out: Array<[string, string]>) {
  if (typeof node === 'string') {
    out.push([path, node]);
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      collectColorValues(value, `${path}.${key}`, out);
    }
  }
}

const colors = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<string, ColorTree>;

describe('tailwind.config theme colours', () => {
  it('has custom colours to check', () => {
    expect(Object.keys(colors).length).toBeGreaterThan(0);
  });

  it('every colour value is a valid hex or a CSS variable', () => {
    const found: Array<[string, string]> = [];
    collectColorValues(colors, 'colors', found);

    expect(found.length).toBeGreaterThan(0);

    const invalid = found.filter(
      ([, value]) => !HEX.test(value.trim()) && !CSS_VAR.test(value.trim())
    );

    expect(
      invalid.map(([path, value]) => `${path} = "${value}"`),
      'these colour tokens are not valid CSS and would emit broken output'
    ).toEqual([]);
  });

  it('regression: warning.50 is a real colour, not a corrupted string', () => {
    const warning = colors.warning as Record<string, string>;

    expect(warning['50']).toBeDefined();
    expect(warning['50']).toMatch(HEX);
    expect(warning['50']).not.toContain(' ');
  });

  it('every custom scale exposes the shades the components rely on', () => {
    // 500/600/700 are what Badge, Button and Alert use. A corrupted value in
    // this range would be shipped to real users.
    for (const scale of ['primary', 'warning', 'danger']) {
      const shades = colors[scale] as Record<string, string>;
      for (const shade of ['500', '600', '700']) {
        expect(shades[shade], `${scale}.${shade} is missing`).toMatch(HEX);
      }
    }
  });

  it('content globs cover every directory that renders Tailwind classes', () => {
    const content = tailwindConfig.content as string[];

    // A new top-level directory would silently lose all of its styling.
    for (const dir of ['./app', './components', './features']) {
      expect(content.some((glob) => glob.startsWith(dir))).toBe(true);
    }
  });
});
