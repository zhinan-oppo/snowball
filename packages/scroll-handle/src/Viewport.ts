import {
  calcPlacement,
  moveResolvedPlacement,
  PlacementOrPercent,
  ResolvedPlacement,
  resolvePlacement,
} from './placement';

export enum BoundaryMode {
  Neither = 0,
  Start = 1,
  End = 2,
  Both = 3,
}

export interface ResolvedViewport {
  start: ResolvedPlacement;
  end: ResolvedPlacement;
}
export interface CalculatedViewport {
  start: number;
  end: number;
  boundary: BoundaryMode;
}

export class Viewport {
  private readonly start: ResolvedPlacement;
  private readonly end: ResolvedPlacement;

  constructor(
    start: PlacementOrPercent,
    end: PlacementOrPercent,
    readonly boundary: BoundaryMode = BoundaryMode.Both,
  ) {
    this.start = resolvePlacement(start, 'b2t');
    this.end = resolvePlacement(end, 'b2t');
  }

  toCalculated(rects: Parameters<typeof calcPlacement>[0]): CalculatedViewport {
    return {
      start: calcPlacement(rects, this.start),
      end: calcPlacement(rects, this.end),
      boundary: this.boundary,
    };
  }

  getBefore(
    movement: PlacementOrPercent,
    boundary: BoundaryMode = this.boundary === BoundaryMode.End
      ? BoundaryMode.Both
      : BoundaryMode.Start,
  ): Viewport {
    const { percent, distance, targetPercent } = resolvePlacement(
      movement,
      'b2t',
    );
    return new Viewport(
      moveResolvedPlacement(this.start, {
        percent: -percent,
        distance: -distance,
        targetPercent: -targetPercent,
      }),
      this.start,
      boundary,
    );
  }

  getAfter(
    movement: PlacementOrPercent,
    boundary: BoundaryMode = this.boundary === BoundaryMode.Start
      ? BoundaryMode.Both
      : BoundaryMode.End,
  ): Viewport {
    return new Viewport(
      this.end,
      moveResolvedPlacement(this.end, resolvePlacement(movement, 'b2t')),
      boundary,
    );
  }

  merge(
    rects: Parameters<typeof calcPlacement>[0],
    ...viewportArray: Viewport[]
  ): CalculatedViewport {
    const start = {
      min: Number.MAX_SAFE_INTEGER,
      included: true,
    };
    const end = {
      max: Number.MIN_SAFE_INTEGER,
      included: true,
    };
    viewportArray.forEach((viewport) => {
      const calculated = viewport.toCalculated(rects);
      if (
        calculated.start < start.min ||
        (calculated.start === start.min && !start.included)
      ) {
        start.min = calculated.start;
        start.included = calculated.boundary !== BoundaryMode.End;
      }

      if (
        calculated.end > end.max ||
        (calculated.end === end.max && !end.included)
      ) {
        end.max = calculated.end;
        end.included = calculated.boundary !== BoundaryMode.Start;
      }
    });

    return {
      start: start.min,
      end: end.max,
      boundary:
        start.included && end.included
          ? BoundaryMode.Both
          : start.included
          ? BoundaryMode.Start
          : end.included
          ? BoundaryMode.End
          : BoundaryMode.Neither,
    };
  }
}
