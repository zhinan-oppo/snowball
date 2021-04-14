import { Rect } from './rect';

export type PercentAlias =
  | 'bottom'
  | 'center'
  | 'top'
  | 'nextPage'
  | 'prevPage';

export type Percent = PercentAlias | number;

type Direction = 'b2t' | 't2b';

type Distance = number | (() => number);

export interface Placement {
  percent: Percent;
  distance: Distance;
  targetPercent: Percent;
  /**
   * 旧的版本没有这个属性，是按照 t2b 来计算的；
   * 为了能够兼容，加上了这个属性
   */
  direction?: Direction;
}

export type PlacementShort = Partial<Placement> | Percent | Distance;
export type PlacementOrPercent = PlacementShort;

export interface ResolvedPlacement extends Pick<Placement, 'distance'> {
  percent: number;
  targetPercent: number;
}

const aliases: { [K in Direction]: { [K in PercentAlias]: number } } = {
  t2b: {
    bottom: 1,
    center: 0.5,
    top: 0,
    nextPage: 2,
    prevPage: -1,
  },
  b2t: {
    bottom: 0,
    center: 0.5,
    top: 1,
    nextPage: -1,
    prevPage: 2,
  },
};

const DEFAULT_DIRECTION: Direction = 't2b';

export function getPercentFromAlias(
  alias: Percent,
  direction: Direction = DEFAULT_DIRECTION,
): number {
  if (typeof alias === 'number') {
    return alias;
  }
  return aliases[direction][alias] || 0;
}

function flipT2B({ percent, distance, targetPercent }: ResolvedPlacement) {
  return {
    percent: 1 - percent,
    distance: -distance,
    targetPercent: -targetPercent,
  };
}

function b2t(placement: ResolvedPlacement, direction: Direction) {
  return direction === 'b2t' ? placement : flipT2B(placement);
}

export function resolveCSSPlacement(
  str: string | number,
  direction: Direction = DEFAULT_DIRECTION,
): ResolvedPlacement {
  if (typeof str === 'number') {
    return b2t({ percent: 0, distance: str, targetPercent: 0 }, direction);
  }
  const alias = aliases[direction];
  if (Object.keys(alias).includes(str)) {
    return b2t(
      {
        percent: alias[str as keyof typeof alias],
        distance: 0,
        targetPercent: 0,
      },
      direction,
    );
  }
  const matches = str.match(/(-?\d+(\.\d*)?)(%|px)?/i);
  if (matches) {
    if (matches[3] === '%') {
      return b2t(
        {
          percent: parseFloat(matches[1]) / 100,
          distance: 0,
          targetPercent: 0,
        },
        direction,
      );
    }
    return b2t(
      {
        percent: 0,
        distance: parseFloat(matches[1]),
        targetPercent: 0,
      },
      direction,
    );
  }
  console.error(`Invalid placement string: ${JSON.stringify(str)}`);
  return b2t({ percent: 0, distance: 0, targetPercent: 0 }, direction);
}

export function resolvePlacement(
  placement: PlacementShort,
  direction: Direction = DEFAULT_DIRECTION,
): ResolvedPlacement {
  if (typeof placement === 'string' || typeof placement === 'number') {
    return resolveCSSPlacement(placement, direction);
  }

  if (typeof placement === 'function') {
    return { percent: 0, targetPercent: 0, distance: placement };
  }

  const percent = getPercentFromAlias(
    placement.percent || 0,
    placement.direction,
  );
  const targetPercent = getPercentFromAlias(
    placement.targetPercent || 0,
    placement.direction,
  );
  const distance = placement.distance || 0;
  return b2t(
    { percent, distance, targetPercent },
    placement.direction || direction,
  );
}

export function resolveDistance(distance: Placement['distance']): number {
  return typeof distance === 'function' ? distance() : distance;
}

export function calcPlacement(
  { rootRect, targetRect }: { rootRect: Rect; targetRect: Rect },
  { percent, distance, targetPercent }: ResolvedPlacement,
): number {
  const dist = typeof distance === 'function' ? distance() : distance;
  return rootRect.height * percent + dist + targetRect.height * targetPercent;
}

export function moveResolvedPlacement(
  from: ResolvedPlacement,
  movement: ResolvedPlacement,
): ResolvedPlacement {
  return {
    percent: from.percent + movement.percent,
    distance: () =>
      resolveDistance(from.distance) + resolveDistance(movement.distance),
    targetPercent: from.targetPercent + movement.targetPercent,
  };
}
