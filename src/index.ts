import { merge, fromEvent, EMPTY, pipe, combineLatest, of } from "rxjs";
import {
  mapTo,
  map,
  pairwise,
  throttleTime,
  switchMap,
  auditTime
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

<div class="alpha" style="width: 50px; height: 50px"></div>
<div style="width: 50px; height: 50px;"></div>
<div class="beta" style="width: 50px; height: 50px"></div>
`;

const alpha = document.querySelector(".alpha")!;
const beta = document.querySelector(".beta")!;
console.log({ alpha, beta });

const focus$ = merge(
  fromEvent(alpha, "mouseenter"),
  fromEvent(beta, "mouseenter")
);
const blur$ = merge(
  fromEvent(alpha, "mouseleave"),
  fromEvent(beta, "mouseleave")
);

fromResize(alpha, beta)
  .pipe(map((resize) => resize.contentRect))
  .subscribe((size) => console.log(size));

fromEvent<MouseEvent>(document, "mousemove")
  .pipe(
    throttleTime(100),
    isTravelingBetween(alpha, beta)
    // switchMap((is) => (is ? of(is) : of(is).pipe(auditTime(60))))
  )
  .subscribe((is) => {
    if (is) {
      alpha.classList.add("towards");
      beta.classList.add("towards");
    } else {
      alpha.classList.remove("towards");
      beta.classList.remove("towards");
    }
  });

// const travel$ = merge(focus$, blur$.pipe(mapTo(EMPTY))).subscribe();

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

function isTravelingBetween(alpha: Element, beta: Element) {
  return pipe(
    pairwise<MouseEvent>(),
    map(([previousEvent, currentEvent]) => {
      const closestAlphaPoints = closestPoints(
        [previousEvent.clientX, previousEvent.clientY],
        alpha.getBoundingClientRect()
      );

      const closestBetaPoints = closestPoints(
        [previousEvent.clientX, previousEvent.clientY],
        beta.getBoundingClientRect()
      );

      return (
        isInTriangle(
          [currentEvent.clientX, currentEvent.clientY],
          [
            ...closestAlphaPoints,
            [previousEvent.clientX, previousEvent.clientY]
          ]
        ) ||
        isInTriangle(
          [currentEvent.clientX, currentEvent.clientY],
          [...closestBetaPoints, [previousEvent.clientX, previousEvent.clientY]]
        )
      );
    })
  );
}
