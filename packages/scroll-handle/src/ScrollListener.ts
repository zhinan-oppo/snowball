import { Placement, ResolvedPlacement, resolvePlacement } from './placement';
import { getWindowRect } from './windowSize';

declare const __DEBUG__: boolean;

export type State = 'before' | 'inView' | 'after';

interface BoundaryY {
  start: number;
  end: number;
}

interface HandlerParams<
  T extends Element = Element,
  TRoot extends Element | Window = Element | Window
> {
  target: T;
  targetRect: DOMRectReadOnly;
  boundaryYActive: BoundaryY;
  boundaryYInView: BoundaryY;
  root: TRoot;
  rootRect: DOMRectReadOnly;
}

export type Handler<
  T extends Element = Element,
  TRoot extends Element | Window = Element | Window
> = (params: HandlerParams<T, TRoot>) => void | 'done';

export interface Handlers<
  T extends Element,
  TRoot extends Element | Window = Element | Window
> {
  onStateChange?: (params: {
    target: T;
    state: State;
    oldState: State;
  }) => void | 'done';
  before?: Handler<T, TRoot>;
  inView?: Handler<T, TRoot>;
  after?: Handler<T, TRoot>;
  always?: Handler<T, TRoot>;
}

interface Placements {
  start: ResolvedPlacement;
  end: ResolvedPlacement;
}

export interface Options<
  T extends Element = Element,
  TRoot extends Element | Window = Element | Window
> {
  handlers: Handlers<T, TRoot>;
  before?: Placement;
  start: Placement;
  end: Placement;
  after?: Placement;
  root: Window | Element;
  passive: boolean;
  forceInViewBoundary: boolean;
  useIntersectionObserver: boolean;
}

export class ScrollListener<T extends Element = Element> {
  private readonly options: Pick<
    Options<T>,
    'passive' | 'forceInViewBoundary' | 'useIntersectionObserver'
  >;

  private readonly target: T;
  private readonly root: Element | Window;

  private readonly handlers: Handlers<T>;

  private placementsInView: Placements;

  private placementsActive: Placements;
  private _targetRect?: DOMRectReadOnly;
  private _rootRect?: DOMRectReadOnly;

  private observer?: IntersectionObserver;
  private _state: State = 'before';

  constructor(
    target: T,
    {
      handlers = {},
      start: _start = {
        percent: 'bottom',
        distance: 0,
      },
      end: _end = {
        percent: 'top',
        distance: 0,
      },
      before: _before,
      after: _after,
      root = window as Window,
      passive = true,
      forceInViewBoundary = false,
      useIntersectionObserver = false,
    }: Partial<Options<T>>,
  ) {
    this.root = root;
    this.target = target;
    this.handlers = handlers;
    this.options = { passive, forceInViewBoundary, useIntersectionObserver };

    const start = resolvePlacement(_start, 'bottom');
    const end = resolvePlacement(_end, 'top');
    this.placementsInView = {
      start,
      end,
    };

    this.placementsActive = {
      start:
        (_before && resolvePlacement(_before, 'bottom')) ||
        resolvePlacement('150%'),
      end:
        (_after && resolvePlacement(_after, 'top')) || resolvePlacement('-50%'),
    };

    this.init();
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
      this.root.removeEventListener('scroll', this.handleScroll);
    }
  }

  private get state() {
    return this._state;
  }
  private set state(state: State) {
    const oldState = this._state;
    this._state = state;
    this.onStateChange(state, oldState);
  }

  private get targetRect(): DOMRectReadOnly {
    if (!this._targetRect) {
      this._targetRect = this.target.getBoundingClientRect();
    }
    return this._targetRect;
  }

  private get rootRect(): DOMRectReadOnly {
    if (!this._rootRect) {
      this._rootRect =
        this.root === window
          ? DOMRect.fromRect(getWindowRect())
          : (this.root as Element).getBoundingClientRect();
    }
    return this._rootRect;
  }

  private get rootMargin(): string {
    const { placementsActive, rootRect } = this;
    const { start, end } = placementsActive;
    const startToTop = this.calcPlacement(start);
    const endToTop = this.calcPlacement(end);
    const height = rootRect.height;

    const bottom =
      endToTop >= startToTop ? height - endToTop - 1 : height - startToTop;
    const top = endToTop;
    return `${-top}px 100% ${-bottom}px 100%`;
  }

  private get boundaryYActive() {
    const { start, end } = this.placementsActive;
    return { start: this.calcPlacement(start), end: this.calcPlacement(end) };
  }

  private get boundaryYInView() {
    const { start, end } = this.placementsInView;
    return { start: this.calcPlacement(start), end: this.calcPlacement(end) };
  }

  private init() {
    if (this.observer) {
      this.observer.disconnect();
    }

    const { root, rootMargin } = this;
    if (__DEBUG__) {
      console.log('init scroll listener', {
        root,
        rootMargin,
        target: this.target,
        placementsActive: this.placementsActive,
        placementsInView: this.placementsInView,
      });
    }
    if (this.options.useIntersectionObserver && window.IntersectionObserver) {
      this.observer = new window.IntersectionObserver(
        ([entry]) => {
          if (__DEBUG__) {
            console.log(entry, this.target);
          }
          if (entry.isIntersecting) {
            this.onActive();
          } else {
            this.onInactive();
          }
        },
        {
          rootMargin,
          root: root instanceof Element ? root : undefined,
        },
      );
      this.observer.observe(this.target);
    } else {
      this.onActive();
    }
  }

  private handle(
    type: keyof Omit<Handlers<T>, 'onStateChange'>,
    targetRect: DOMRectReadOnly = this.targetRect,
  ) {
    const {
      target,
      root,
      rootRect,
      boundaryYActive,
      boundaryYInView,
      handlers,
    } = this;
    const handler = handlers[type];
    if (handler) {
      if (
        handler({
          target,
          root,
          targetRect,
          rootRect,
          boundaryYActive,
          boundaryYInView,
        }) === 'done'
      ) {
        handlers[type] = undefined;
      }
    }
  }

  private onStateChange(state: State, oldState: State) {
    const { handlers, target } = this;
    if (__DEBUG__) {
      console.log(`${oldState} => ${state}`, target);
    }
    if (handlers.onStateChange) {
      if (handlers.onStateChange({ target, state, oldState }) === 'done') {
        handlers.onStateChange = undefined;
      }
    }
  }

  private refresh() {
    this._targetRect = undefined;
    this._rootRect = undefined;
  }

  private readonly handleScroll = () => {
    this.refresh();

    window.requestAnimationFrame(() => {
      const { targetRect, boundaryYInView } = this;
      const { top, bottom } = targetRect;
      const state =
        top > boundaryYInView.start
          ? 'before'
          : bottom < boundaryYInView.end
          ? 'after'
          : 'inView';
      if (state !== this.state) {
        if (this.options.forceInViewBoundary && state !== 'inView') {
          const boundaryRect = DOMRect.fromRect({
            x: targetRect.x,
            width: targetRect.width,
            height: targetRect.height,
            y:
              state === 'before'
                ? boundaryYInView.start
                : boundaryYInView.end - targetRect.height,
          });
          if (state === 'after') {
            this.handle('inView', boundaryRect);
          }
          this.state = state;
          if (state === 'before') {
            this.handle('inView', boundaryRect);
          }
        } else {
          this.state = state;
        }
      }
      this.handle(state, targetRect);
      this.handle('always', targetRect);
    });
  };

  private onActive() {
    if (__DEBUG__) {
      console.log('active', this.target);
    }
    if (Object.keys(this.handlers).length > 0) {
      this.root.addEventListener('scroll', this.handleScroll, {
        passive: true,
      });
      this.handleScroll();
    }
  }

  private onInactive() {
    this.handleScroll();
    this.root.removeEventListener('scroll', this.handleScroll);
    if (__DEBUG__) {
      console.log('inactive', this.target);
    }
  }

  private calcPlacement({
    percent,
    distance,
    targetPercent,
  }: ResolvedPlacement) {
    const { rootRect, targetRect } = this;
    return (
      rootRect.height * percent + distance + targetRect.height * targetPercent
    );
  }
}
