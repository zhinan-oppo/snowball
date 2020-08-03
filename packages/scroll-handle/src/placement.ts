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

export function resolveCSSPlacement(str: string | number): ResolvedPlacement {
  if (typeof str === 'number') {
    return { percent: 0, distance: str, targetPercent: 0 };
  }
  if (Object.keys(PERCENTS).includes(str)) {
    return {
      percent: PERCENTS[str as keyof typeof PERCENTS],
      distance: 0,
      targetPercent: 0,
    };
  }
  const matches = str.match(/(-?\d+(\.\d*)?)(%|px)?/i);
  if (matches) {
    console.log(matches);
    if (matches[3] === '%') {
      return {
        percent: parseFloat(matches[1]) / 100,
        distance: 0,
        targetPercent: 0,
      };
    }
    return { percent: 0, distance: parseFloat(matches[1]), targetPercent: 0 };
  }
  console.error(`Invalid sticky top: ${JSON.stringify(str)}`);
  return { percent: 0, distance: 0, targetPercent: 0 };
}

export function resolvePlacement(
  placement: Partial<PlacementToTop> | PercentToTop | string,
  defaultAlias: keyof typeof PERCENTS = 'top',
): ResolvedPlacement {
  return typeof placement === 'string' || typeof placement === 'number'
    ? resolveCSSPlacement(placement)
    : {
        percent: getPercentFromAlias(placement.percent ?? defaultAlias),
        distance: placement.distance ?? 0,
        targetPercent: getPercentFromAlias(placement.targetPercent ?? 0),
      };
}
