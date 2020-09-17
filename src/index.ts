import {
  merge,
  fromEvent,
  EMPTY,
  pipe,
  combineLatest,
  of,
  timer,
  BehaviorSubject,
  ReplaySubject,
  Subject,
  from
} from "rxjs";
import {
  mapTo,
  map,
  pairwise,
  throttleTime,
  switchMap,
  auditTime,
  debounce,
  audit,
  throttle,
  concatMap,
  tap,
  startWith,
  mergeMap,
  distinctUntilChanged,
  take,
  takeUntil,
  multicast,
  refCount,
  share,
  publishReplay,
  publish
} from "rxjs/operators";
import { fromResize } from "./resizeObservable";

import "./index.css";

document.getElementById("app")!.innerHTML = `
<h1>Hello Parcel!</h1>
<div>
  Look
  <a href="https://parceljs.org" target="_blank" rel="noopener noreferrer">here</a>
  for more info about Parcel.
</div>

<div class="alpha" style="width: 50px; height: 50px" tabindex="0"></div>
<div style="width: 50px; height: 50px;"></div>
<div class="beta" style="width: 50px; height: 50px"></div>
`;

const alpha = document.querySelector(".alpha")!;
const beta = document.querySelector(".beta")!;
console.log({ alpha, beta });

const testSubject = new ReplaySubject();
const source = from([1, 2, 3]);
const multi$ = source.pipe(multicast(testSubject), refCount());

testSubject.next("foo");

multi$.subscribe((x) => console.log(x));

// setTimeout(() => {
// }, 1000);

enum EventType {
  KEYBOARD,
  MOUSE
}

const mouseFocusFoo$ = new ReplaySubject();

const show$ = new Subject();
const hide$ = new Subject();

const mouseFocus$ = merge(
  fromEvent(alpha, "mouseenter"),
  fromEvent(beta, "mouseenter")
).pipe(mapTo(EventType.MOUSE));
const keyboardFocus$ = merge(
  fromEvent(alpha, "focus"),
  fromEvent(beta, "focus")
).pipe(mapTo(EventType.KEYBOARD));

// merge(fromEvent(alpha, "mouseenter"), fromEvent(beta, "mouseenter"))
merge(mouseFocus$, keyboardFocus$)
  .pipe(
    // tap(() => console.log("mouseenter")),
    switchMap((eventType: EventType) => {
      const init$ = of(true);
      const mouse$ = merge(
        fromEvent(alpha, "mouseleave"),
        fromEvent(beta, "mouseleave")
      ).pipe(
        // tap(() => console.log("mouseleave")),
        switchMap(() => {
          return fromEvent<MouseEvent>(document, "mousemove").pipe(
            throttleTime(50),
            // tap(() => console.log("mousemove")),
            isTravelingTowards([beta]),
            distinctUntilChanged(),
            debounce((is) => (is ? of(is) : timer(60))),
            takeUntil(hide$)
          );
        })
      );

      const keyboard$ = merge(
        fromEvent(alpha, "blur"),
        fromEvent(beta, "blur")
      ).pipe(
        debounce(() => timer(60)),
        mapTo(false)
      );

      if (eventType === EventType.MOUSE) {
        return merge(init$, mouse$);
      } else {
        return merge(init$, keyboard$);
      }

      //return merge(
      //  of(true),
      //  merge(
      //    fromEvent(alpha, "mouseleave"),
      //    fromEvent(beta, "mouseleave")
      //  ).pipe(
      //    // tap(() => console.log("mouseleave")),
      //    switchMap(() => {
      //      return fromEvent<MouseEvent>(document, "mousemove").pipe(
      //        throttleTime(50),
      //        // tap(() => console.log("mousemove")),
      //        isTravelingTowards([beta]),
      //        distinctUntilChanged(),
      //        debounce((is) => (is ? of(is) : timer(60))),
      //        takeUntil(hide$)
      //      );
      //    })
      //  )
      //);
    })
  )
  .subscribe((is) => {
    console.log(is);
    if (is) {
      alpha.classList.add("towards");
      beta.classList.add("towards");
    } else {
      hide$.next();
      alpha.classList.remove("towards");
      beta.classList.remove("towards");
    }
  });

type Point = [number, number];

function distance(pointA: Point, pointB: Point): number {
  return Math.sqrt(
    Math.pow(pointB[0] - pointA[0], 2) + Math.pow(pointB[1] - pointA[1], 2)
  );
}

function closestPoints(point: Point, rect: DOMRect): [Point, Point] {
  const topLeft: Point = [rect.left, rect.top];
  const topRight: Point = [rect.right, rect.top];
  const bottomRight: Point = [rect.right, rect.bottom];
  const bottomLeft: Point = [rect.left, rect.bottom];

  const distances: [Point, number][] = [
    [topLeft, distance(point, topLeft)],
    [topRight, distance(point, topRight)],
    [bottomRight, distance(point, bottomRight)],
    [bottomLeft, distance(point, bottomLeft)]
  ];

  const sortedPoints = distances
    .sort((d1, d2) => d1[1] - d2[1])
    .map((d) => d[0]);

  if (
    (sortedPoints[0][0] <= point[0] && point[0] <= sortedPoints[1][0]) ||
    (sortedPoints[0][1] <= point[1] && point[1] <= sortedPoints[1][1])
  ) {
    return [sortedPoints[0], sortedPoints[1]]; // two-closest
  }

  return [sortedPoints[1], sortedPoints[2]]; // not two-closest
}

// barycentric
function isInTriangle(
  point: Point,
  [p1, p2, p3]: [Point, Point, Point]
): boolean {
  const denominator =
    (p2[1] - p3[1]) * (p1[0] - p3[0]) + (p3[0] - p2[0]) * (p1[1] - p3[1]);
  const a =
    ((p2[1] - p3[1]) * (point[0] - p3[0]) +
      (p3[0] - p2[0]) * (point[1] - p3[1])) /
    denominator;
  const b =
    ((p3[1] - p1[1]) * (point[0] - p3[0]) +
      (p1[0] - p3[0]) * (point[1] - p3[1])) /
    denominator;
  const c = 1 - a - b;
  return 0 <= a && a <= 1 && 0 <= b && b <= 1 && 0 <= c && c <= 1;
}

type TravelEvent = Pick<MouseEvent, "clientX" | "clientY">;

function isTravelingTowards(elements: Element[]) {
  return pipe(
    startWith<TravelEvent>({
      clientX: 0,
      clientY: 0
    }),
    pairwise(),
    map(([previousEvent, currentEvent]) => {
      return elements.some((e) => {
        const points = closestPoints(
          [previousEvent.clientX, previousEvent.clientY],
          e.getBoundingClientRect()
        );
        return isInTriangle(
          [currentEvent.clientX, currentEvent.clientY],
          [...points, [previousEvent.clientX, previousEvent.clientY]]
        );
      });
    })
  );
}
