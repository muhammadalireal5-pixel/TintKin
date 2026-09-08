export const SKIN_METRICS = Object.freeze({
  WRINKLES: 'wrinkles',
  FIRMNESS: 'firmness',
  SPOTS: 'spots',
  RADIANCE: 'radiance',
});

export const METRIC_LABELS = Object.freeze({
  [SKIN_METRICS.WRINKLES]: 'Wrinkle Smoothness',
  [SKIN_METRICS.FIRMNESS]: 'Firmness',
  [SKIN_METRICS.SPOTS]: 'Spot Clarity',
  [SKIN_METRICS.RADIANCE]: 'Radiance',
});

export const YOUCAM_ACTION_MAP = Object.freeze({
  wrinkle: SKIN_METRICS.WRINKLES,
  firmness: SKIN_METRICS.FIRMNESS,
  age_spot: SKIN_METRICS.SPOTS,
  radiance: SKIN_METRICS.RADIANCE,
});

export const YOUCAM_DST_ACTIONS = Object.freeze([
  'wrinkle',
  'firmness',
  'age_spot',
  'radiance',
]);
