import {
  calcPlacement,
  moveResolvedPlacement,
  PlacementShort,
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
export interface CalculatedViewport<T = never> {
  start: number;
  end: number;
  boundary: BoundaryMode;
  context: T;
}

export class Viewport<TContext = never> {
  static create(
    start: PlacementShort,
    end: PlacementShort,
    boundary?: BoundaryMode,
    context?: undefined,
  ): Viewport<undefined>;
  static create<T>(
    start: PlacementShort,
    end: PlacementShort,
    boundary: BoundaryMode | undefined,
    context: T,
  ): Viewport<T>;
  static create<T>(...args: [any, any, any, any]): Viewport<T> {
    return new Viewport<T>(...args);
  }

  private readonly start: ResolvedPlacement;
  private readonly end: ResolvedPlacement;

  private constructor(
    start: PlacementShort,
    end: PlacementShort,
    readonly boundary: BoundaryMode = BoundaryMode.Both,
    readonly context: TContext,
  ) {
    this.start = resolvePlacement(start, 'b2t');
    this.end = resolvePlacement(end, 'b2t');
  }

  toCalculated(
    rects: Parameters<typeof calcPlacement>[0],
  ): CalculatedViewport<TContext> {
    return {
      start: calcPlacement(rects, this.start),
      end: calcPlacement(rects, this.end),
      boundary: this.boundary,
      context: this.context,
    };
  }

  getBefore(
    movement: PlacementShort,
    boundary: BoundaryMode = this.boundary === BoundaryMode.End
      ? BoundaryMode.Both
      : BoundaryMode.Start,
  ): Viewport<TContext> {
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
      this.context,
    );
  }

  getAfter(
    movement: PlacementShort,
    boundary: BoundaryMode = this.boundary === BoundaryMode.Start
      ? BoundaryMode.Both
      : BoundaryMode.End,
  ): Viewport<TContext> {
    return new Viewport(
      this.end,
      moveResolvedPlacement(this.end, resolvePlacement(movement, 'b2t')),
      boundary,
      this.context,
    );
  }

  merge(
    rects: Parameters<typeof calcPlacement>[0],
    ...viewportArray: Viewport[]
  ): CalculatedViewport<TContext> {
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
      context: this.context,
    };
  }
}
