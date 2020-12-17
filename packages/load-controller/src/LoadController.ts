type LoadResultCallback = (element: HTMLElement, i: number) => void;

type ProgressCallback = (ctx: {
  cnt: number;
  total: number;
  i: number;
  element: HTMLElement;
}) => void;

export interface Loader {
  load(
    elements: HTMLElement | HTMLElement[],
    options?: { onLoaded?: LoadResultCallback; onError?: LoadResultCallback },
  ): Promise<void>;
}

export interface Options {
  /**
   * limit <= 0 时不限制同时加载的数量
   */
  limit: number;
}

type Priority = 'high' | 'normal' | 'low';

export interface GroupContext {
  priority: Priority;
  elements: HTMLElement[];
  elementStates: Array<'loading' | 'error' | 'loaded' | undefined>;
  onProgress?: ProgressCallback;
  gap: number;
  offset: number;
  base: number;
  start: number;
  elementsRetrying: Array<HTMLElement | undefined>;
}

interface ElementRef {
  element: HTMLElement;
  belongsTo: GroupContext;
  iInGroup: number;
  retryOf?: number;
}

interface GroupController {
  setPriority(priority: Priority): void;
}

export class LoadController {
  private readonly options: Options;

  private readonly queues: Record<Priority, GroupContext[]> = {
    high: [],
    normal: [],
    low: [],
  };

  private readonly loadingContext: {
    elements: ElementRef[];
    cur: Record<'high' | 'normal', number>;
  } = {
    elements: [],
    cur: {
      high: 0,
      normal: 0,
    },
  };

  constructor(
    private readonly loader: Loader,
    { limit = 0 }: Partial<Options>,
  ) {
    this.options = { limit };
  }

  pushGroup(
    elements: HTMLElement[],
    {
      gap = 1,
      start = 0,
      onProgress,
    }: {
      gap?: number;
      start?: number;
      autoStart: boolean;
      onProgress?: ProgressCallback;
    },
  ): GroupController {
    if (!elements || elements.length < 1) {
      return {
        setPriority() {
          console.error('传入的 elements 元素为空');
        },
      };
    }

    const group: GroupContext = {
      elements,
      gap,
      onProgress,
      start,
      priority: 'low',
      elementStates: elements.map(() => undefined),
      base: 0,
      offset: 0,
      elementsRetrying: [],
    };
    this.queues.low.push(group);

    return {
      setPriority: (priority: Priority) => {
        return this.setPriority(group, priority);
      },
    };
  }

  load(): void {
    const { loadingContext, options } = this;
    while (
      options.limit <= 0 || // limit <= 0 即不限制
      loadingContext.elements.length < options.limit
    ) {
      const group = this.getGroupToLoad();
      if (!group) {
        break;
      }

      this.loadNextElementInGroup(group);
    }
  }

  private loadNextElementInGroup(group: GroupContext) {
    const { base, offset, start, gap, elements, elementStates } = group;
    if (offset === gap) {
      // 循环到头了
      // 将 group 从加载队列中移除
      this.popGroupFromQueue(group);
      return;
    }

    const shift = (base * gap + offset + start) % elements.length;
    const element = elements[shift];

    const { loadingContext } = this;
    loadingContext.elements.push({
      element,
      belongsTo: group,
      iInGroup: shift,
    });

    const onProgress = () => {
      if (group.onProgress) {
        group.onProgress({
          element,
          total: elements.length,
          cnt: elementStates.reduce(
            (cnt, state) => cnt + (state === undefined ? 0 : 1),
            0,
          ),
          i: offset,
        });
      }

      // 移出正在加载队列
      const i = loadingContext.elements.findIndex(
        ({ element: ref }) => ref === element,
      );
      if (i >= 0) {
        loadingContext.elements.splice(i, 1);
      }

      // 检查是否可以加载其它资源
      this.load();
    };

    this.loader.load(element, {
      onLoaded: () => {
        elementStates[offset] = 'loaded';
        onProgress();
      },
      onError: () => {
        elementStates[offset] = 'error';
        onProgress();
      },
    });
    elementStates[offset] = 'loading';

    group.base += 1;
    if (group.base * gap + offset >= elements.length) {
      group.base = 0;
      group.offset += 1;
    }
  }

  private getGroupToLoad() {
    const pri =
      this.queues.high.length > 0
        ? 'high'
        : this.queues.normal.length > 0
        ? 'normal'
        : undefined;
    if (!pri) {
      return undefined;
    }

    const cur = this.loadingContext.cur[pri];
    const group = this.queues[pri][cur];

    // 同一优先级的 groups，轮询
    this.loadingContext.cur[pri] = cur + 1;
    if (this.loadingContext.cur[pri] >= this.queues[pri].length) {
      this.loadingContext.cur[pri] = 0;
    }
    return group;
  }

  private popGroupFromQueue(group: GroupContext) {
    const queue = this.queues[group.priority];
    const indexInOldQueue = queue.indexOf(group);
    if (indexInOldQueue < 0) {
      // 不存在
      return undefined;
    }

    queue.splice(indexInOldQueue, 1);

    if (
      group.priority !== 'low' &&
      this.loadingContext.cur[group.priority] > indexInOldQueue
    ) {
      // 将指向该 group 的指针向前移
      this.loadingContext.cur[group.priority] = Math.max(
        0,
        this.loadingContext.cur[group.priority] - 1,
      );
    }

    return group;
  }

  /**
   * NOTE: 现在只是简单地将 element 移出了加载队列使得其它 element 能够被加载
   * TODO: 还需要处理 取消加载--重新加载
   */
  private cancelElementsInGroup(group: GroupContext) {
    const notInGroup = this.loadingContext.elements.filter(
      ({ belongsTo }) => belongsTo !== group,
    );

    this.loadingContext.elements = notInGroup;
  }

  private setPriority(_group: GroupContext, priority: Priority) {
    if (priority === _group.priority) {
      return;
    }

    const group = this.popGroupFromQueue(_group);
    if (!group) {
      return;
    }

    // 将 group 移入新的队列中
    group.priority = priority;
    this.queues[priority].push(group);

    if (priority !== 'low') {
      this.load();
    } else {
      this.cancelElementsInGroup(group);
    }
  }
}
