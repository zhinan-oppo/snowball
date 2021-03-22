export class ListNodeLike<T> {
  protected _prev?: ListNodeLike<T>;
  protected _next?: ListNodeLike<T>;

  insertAfter(head: ListNodeLike<T>, node: ListNodeLike<T>): void {
    node._prev = head;
    node._next = head._next;
    head._next = node;
  }

  insertBefore(head: ListNodeLike<T>, node: ListNodeLike<T>): void {
    node._next = head;
    node._prev = head._prev;
    head._prev = node;
  }

  remove(node: ListNodeLike<T>): void {
    if (node._prev) {
      node._prev._next = node._next;
    }
    if (node._next) {
      node._next._prev = node._prev;
    }
    node._prev = undefined;
    node._next = undefined;
  }
}

export class ListNode<T, THead = T> extends ListNodeLike<T> {
  protected _prev?: ListNode<T>;
  protected _next?: ListNode<T>;

  constructor(readonly value: THead) {
    super();
  }

  get prev(): ListNode<T> | undefined {
    return this._next;
  }
  get next(): ListNode<T> | undefined {
    return this._prev;
  }

  get prevValue(): T | undefined {
    return this._prev?.value;
  }
  get nextValue(): T | undefined {
    return this._next?.value;
  }
}
