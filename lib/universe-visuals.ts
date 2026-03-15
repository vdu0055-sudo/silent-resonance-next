import type { FrequencyId, StateId, UniverseStar } from './silent-resonance';

type VisualFrequencyId = FrequencyId | 'dormant';

type FrequencyVisual = {
  id: VisualFrequencyId;
  label: string;
  color: string;
  ripple: number;
  pulseDuration: number;
  haloDuration: number;
  pulseScale: number;
  haloScale: number;
  auraOpacity: number;
  shellOpacity: number;
  rippleScale: number;
  rippleOpacity: number;
  sheenDuration: number;
  driftFactor: number;
  selectable?: boolean;
};

export type VisualStar = {
  id: string;
  nickname: string | null;
  primary: VisualFrequencyId;
  secondary: FrequencyId[];
  state: StateId;
  position: {
    x: number;
    y: number;
  };
  size: number;
  drift: {
    x: number;
    y: number;
  };
  delay: string;
  isUser: boolean;
  isCalibrated: boolean;
  color: string;
};

const USER_STAR_POSITIONS = [
  { x: 58, y: 52 },
  { x: 64, y: 47 },
  { x: 54, y: 61 },
  { x: 69, y: 56 },
  { x: 47, y: 49 },
];

export const VISUAL_FREQUENCIES: FrequencyVisual[] = [
  {
    id: 'dormant',
    label: '尚未显露',
    color: '#8b96aa',
    ripple: 19.4,
    pulseDuration: 15.8,
    haloDuration: 18.6,
    pulseScale: 1.02,
    haloScale: 1.12,
    auraOpacity: 0.3,
    shellOpacity: 0.54,
    rippleScale: 4.8,
    rippleOpacity: 0.11,
    sheenDuration: 26,
    driftFactor: 1.12,
    selectable: false,
  },
  {
    id: 'philosophy',
    label: '哲学',
    color: '#6d5a8d',
    ripple: 15.8,
    pulseDuration: 11.6,
    haloDuration: 14.2,
    pulseScale: 1.04,
    haloScale: 1.2,
    auraOpacity: 0.46,
    shellOpacity: 0.68,
    rippleScale: 4.9,
    rippleOpacity: 0.2,
    sheenDuration: 22,
    driftFactor: 1.14,
  },
  {
    id: 'music',
    label: '音乐',
    color: '#9ab9db',
    ripple: 11.2,
    pulseDuration: 7.4,
    haloDuration: 9.2,
    pulseScale: 1.11,
    haloScale: 1.1,
    auraOpacity: 0.62,
    shellOpacity: 0.78,
    rippleScale: 4.45,
    rippleOpacity: 0.28,
    sheenDuration: 13.5,
    driftFactor: 0.94,
  },
  {
    id: 'literature',
    label: '文学',
    color: '#92bcc4',
    ripple: 14.3,
    pulseDuration: 9.6,
    haloDuration: 11.4,
    pulseScale: 1.07,
    haloScale: 1.12,
    auraOpacity: 0.54,
    shellOpacity: 0.72,
    rippleScale: 4.6,
    rippleOpacity: 0.24,
    sheenDuration: 18.5,
    driftFactor: 1.01,
  },
  {
    id: 'cinema',
    label: '电影',
    color: '#6c4350',
    ripple: 12.6,
    pulseDuration: 8.8,
    haloDuration: 10.6,
    pulseScale: 1.08,
    haloScale: 1.18,
    auraOpacity: 0.5,
    shellOpacity: 0.7,
    rippleScale: 4.95,
    rippleOpacity: 0.22,
    sheenDuration: 16,
    driftFactor: 1.02,
  },
  {
    id: 'writing',
    label: '写作',
    color: '#d6e3f0',
    ripple: 13.9,
    pulseDuration: 9.2,
    haloDuration: 10.8,
    pulseScale: 1.05,
    haloScale: 1.08,
    auraOpacity: 0.48,
    shellOpacity: 0.8,
    rippleScale: 4.35,
    rippleOpacity: 0.19,
    sheenDuration: 20,
    driftFactor: 0.98,
  },
  {
    id: 'cosmos',
    label: '宇宙',
    color: '#49679f',
    ripple: 16.8,
    pulseDuration: 13.4,
    haloDuration: 15.6,
    pulseScale: 1.03,
    haloScale: 1.24,
    auraOpacity: 0.66,
    shellOpacity: 0.64,
    rippleScale: 5.15,
    rippleOpacity: 0.2,
    sheenDuration: 24,
    driftFactor: 1.18,
  },
  {
    id: 'walking',
    label: '散步',
    color: '#6ca89a',
    ripple: 12.8,
    pulseDuration: 8.4,
    haloDuration: 10.2,
    pulseScale: 1.09,
    haloScale: 1.1,
    auraOpacity: 0.58,
    shellOpacity: 0.72,
    rippleScale: 4.55,
    rippleOpacity: 0.25,
    sheenDuration: 15.5,
    driftFactor: 0.93,
  },
  {
    id: 'mind',
    label: '心理',
    color: '#847c96',
    ripple: 14.9,
    pulseDuration: 10.4,
    haloDuration: 12.6,
    pulseScale: 1.06,
    haloScale: 1.16,
    auraOpacity: 0.5,
    shellOpacity: 0.7,
    rippleScale: 4.7,
    rippleOpacity: 0.21,
    sheenDuration: 19.2,
    driftFactor: 1.08,
  },
];

export const VISUAL_STATES: Array<{ id: StateId; label: string }> = [
  { id: 'solo', label: '想独处' },
  { id: 'understood', label: '想被理解' },
  { id: 'silent', label: '不想说话' },
  { id: 'recovering', label: '正在恢复' },
  { id: 'present', label: '只是静静待着' },
  { id: 'gentle-link', label: '愿意轻微连接' },
];

type AppearanceInput = Pick<VisualStar, 'primary' | 'secondary' | 'isUser'>;

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededUnit(seed: number, salt: number) {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453123;
  return value - Math.floor(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : normalized;
  const number = Number.parseInt(value, 16);

  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function mixHexColors(colors: string[]) {
  if (!colors.length) {
    return '#89a2c3';
  }

  const total = colors.reduce(
    (result, color) => {
      const { r, g, b } = hexToRgb(color);

      return {
        r: result.r + r,
        g: result.g + g,
        b: result.b + b,
      };
    },
    { r: 0, g: 0, b: 0 },
  );

  const average = {
    r: Math.round(total.r / colors.length),
    g: Math.round(total.g / colors.length),
    b: Math.round(total.b / colors.length),
  };

  return `#${[average.r, average.g, average.b]
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('')}`;
}

function resolveRemotePosition(seed: number) {
  let x = 12 + seededUnit(seed, 1) * 76;
  let y = 12 + seededUnit(seed, 2) * 72;

  if (x > 38 && x < 64 && y > 26 && y < 72) {
    x += x < 51 ? -15 : 15;
    y += y < 48 ? -10 : 10;
  }

  return {
    x: clamp(x, 8, 92),
    y: clamp(y, 10, 88),
  };
}

function resolveUserPosition(seed: number) {
  return USER_STAR_POSITIONS[seed % USER_STAR_POSITIONS.length] ?? USER_STAR_POSITIONS[0];
}

export function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getFrequencyById(id: VisualFrequencyId | null | undefined) {
  return VISUAL_FREQUENCIES.find((item) => item.id === id);
}

export function getStateLabel(id: StateId | null | undefined) {
  return VISUAL_STATES.find((item) => item.id === id)?.label ?? '';
}

export function formatSecondary(secondaryIds: FrequencyId[]) {
  if (!secondaryIds.length) {
    return '只保留主频';
  }

  return secondaryIds
    .map((id) => getFrequencyById(id)?.label)
    .filter(Boolean)
    .join(' · ');
}

export function buildStarAppearance(star: AppearanceInput) {
  const primary = getFrequencyById(star.primary) ?? getFrequencyById('dormant') ?? VISUAL_FREQUENCIES[0];
  const edgeColor = mixHexColors(
    star.secondary
      .map((id) => getFrequencyById(id))
      .filter((item): item is FrequencyVisual => Boolean(item))
      .map((item) => item.color),
  );
  const userBoost = star.isUser ? 0.04 : 0;

  return {
    primary,
    edgeColor,
    coreGlow: withAlpha(primary.color, star.isUser ? 0.55 : 0.36),
    haloGlow: withAlpha(primary.color, star.isUser ? 0.28 : 0.18),
    ringColor: withAlpha(edgeColor, 0.24),
    ringGlow: withAlpha(edgeColor, 0.1),
    pulseDuration: primary.pulseDuration,
    haloDuration: primary.haloDuration,
    pulseScale: primary.pulseScale + (star.isUser ? 0.02 : 0),
    haloScale: primary.haloScale + (star.isUser ? 0.03 : 0),
    auraOpacity: Math.min(0.82, primary.auraOpacity + userBoost),
    shellOpacity: Math.min(0.92, primary.shellOpacity + userBoost),
    rippleScale: primary.rippleScale + (star.isUser ? 0.12 : 0),
    rippleOpacity: Math.min(0.34, primary.rippleOpacity + (star.isUser ? 0.03 : 0)),
    sheenDuration: primary.sheenDuration,
    driftFactor: primary.driftFactor,
  };
}

export function mapUniverseStarsToScene(stars: UniverseStar[], myStarId: string | null) {
  return stars.map((star) => {
    const seed = hashString(star.id);
    const isUser = star.id === myStarId;
    const position = isUser ? resolveUserPosition(seed) : resolveRemotePosition(seed);

    return {
      id: star.id,
      nickname: star.nickname,
      primary: star.primary_frequency,
      secondary: star.secondary_frequencies,
      state: star.current_state,
      position,
      size: 12 + seededUnit(seed, 3) * 8 + (isUser ? 3 : 0),
      drift: {
        x: Math.round((seededUnit(seed, 4) - 0.5) * 34),
        y: Math.round((seededUnit(seed, 5) - 0.5) * 28),
      },
      delay: `-${(seededUnit(seed, 6) * 5.6 + 0.4).toFixed(1)}s`,
      isUser,
      isCalibrated: true,
      color: star.color,
    } satisfies VisualStar;
  });
}
