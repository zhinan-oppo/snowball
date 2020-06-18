export type PercentToTopAlias = keyof typeof PERCENTS;

export type PercentToTop = PercentToTopAlias | number;

export interface PlacementToTop {
  percent: PercentToTop;
  distance: number;
  targetPercent: PercentToTop;
}

export type Placement = Partial<PlacementToTop> | PercentToTop;

export interface ResolvedPlacement {
  percent: number;
  distance: number;
  targetPercent: number;
}

export const PERCENTS = {
  bottom: 1,
  center: 0.5,
  top: 0,
  nextPage: 2,
  prevPage: -1,
};

export function getPercentFromAlias(alias: PercentToTop): number {
  if (typeof alias === 'number') {
    return alias;
  }
  return PERCENTS[alias] || 0;
}

export function resolvePlacement(
  placement: Partial<PlacementToTop> | PercentToTop,
  defaultAlias: keyof typeof PERCENTS = 'top',
): ResolvedPlacement {
  return typeof placement === 'string' || typeof placement === 'number'
    ? {
        percent: getPercentFromAlias(placement),
        distance: 0,
        targetPercent: 0,
      }
    : {
        percent: getPercentFromAlias(placement.percent || defaultAlias),
        distance: placement.distance || 0,
        targetPercent: getPercentFromAlias(placement.targetPercent || 0),
      };
}
