// Tailwind CSS's default spacing scale, expressed in px. Used as the fallback
// "on-scale" set when no project-specific scale is configured or detected.
export const DEFAULT_SPACING_SCALE_PX: readonly number[] = [
  0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60,
  64, 72, 80, 96, 112, 128, 144, 160, 176, 192, 208, 224, 240, 256, 288, 320,
  384,
];

export const PX_PER_REM = 16;

// Tailwind's default spacing utility suffixes (the part after the `-`),
// e.g. `p-4`, `gap-x-1.5`, `inset-px`. Matching one of these (and not an
// arbitrary `[...]` value) means the class already references the design
// system's spacing scale, so it counts as a token reference, not a raw value.
export const TAILWIND_SPACING_SUFFIXES: readonly string[] = [
  '0', 'px', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7',
  '8', '9', '10', '11', '12', '14', '16', '20', '24', '28', '32', '36', '40',
  '44', '48', '52', '56', '60', '64', '72', '80', '96',
];
