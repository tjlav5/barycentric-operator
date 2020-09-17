import { Observable } from "rxjs";
import { startWith } from "rxjs/operators";
import ResizeObserver from "resize-observer-polyfill";

export interface DOMRectReadOnly {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface ResizeObserverEntry {
  readonly target: Element;
  readonly contentRect: DOMRectReadOnly;
}

/**
 * Create an observable which will emit every time the passed in elements get resized
 * The event will contain a target: `Element` and contentRect: `ResizeObserverEntry`
 * @param elements The elements you want to get resize events for
 */
export function fromResize(
  ...elements: Element[]
): Observable<ResizeObserverEntry> {
  return Observable.create(function (observer) {
    const resizeObserver = new ResizeObserver((observerEntries) => {
      // trigger a new item on the stream when resizes happen
      for (const entry of observerEntries) {
        console.log("new size", entry);
        observer.next(entry);
      }
    });

    // start listening for resize events
    for (const el of elements) {
      console.log("observe", el);
      resizeObserver.observe(el);
    }

    // cancel resize observer on cancelation
    return () => resizeObserver.disconnect();
  }).pipe(
    startWith({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    })
  );
}
