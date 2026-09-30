import { cn } from "@/lib/utils";

/**
 * The possum mark, straight out of Paper. Seven shapes, no strokes, no
 * gradients — which is what lets it invert without a second artwork.
 *
 * Two values do all the work, and which shapes take which matters. The figure
 * is the body and the eye highlight; the ground is the tile plus the four
 * details that punch back through it — the ear inners, the eye socket and the
 * nose. Set the details to the figure colour instead and the face fills in
 * solid, which is the one way this mark can be broken. Routing all six ground
 * shapes through a single custom property makes that impossible by
 * construction, and lets a caller retint the mark with one value.
 */
export const PossumMark = ({
  className,
  ground = "var(--background)",
  style,
  ...props
}: React.ComponentProps<"svg"> & { ground?: string }) => (
  <svg
    viewBox="0 0 40 40"
    aria-hidden="true"
    className={cn("size-8", className)}
    style={{ "--possum-ground": ground, ...style } as React.CSSProperties}
    {...props}
  >
    <rect
      fill="var(--possum-ground)"
      height="38.76"
      rx="7.929"
      width="38.76"
      x=".6362"
      y=".583"
    />
    <path
      className="fill-foreground"
      d="m28.84 18.16c-0.4-1.21-0.89-2.34-1.36-3.1 0.79-0.95 1.22-2.11 1.22-3.28 0-1.41-0.72-2.7-2.07-2.7-1.27 0-3.02 1.16-3.7 2.31-0.84-0.24-1.89-0.32-2.77-0.28-0.64-1.96-2.39-3.43-4.19-3.43-1.87 0-3.68 2.06-3.68 4.33 0 1.18 0.47 2.26 1.14 2.87-2.72 1.77-4.69 4.96-4.69 7.85 0 5.25 5.75 9.54 11.87 9.54 1.34 0 2.69-0.22 2.88-0.38 0.07-0.11 0.13-0.63 0.13-1.24 0-3.07-2.03-6.09-5.43-6.93-0.12-0.03-0.06-0.1 0.03-0.13 0.47-0.15 1-0.21 1.44-0.21 2.59 0.04 5.08 1.57 7.98 1.57 2.78 0 4.09-1.04 4.08-2.28-0.01-0.98-2.03-2.24-2.88-4.51z"
    />
    <path
      fill="var(--possum-ground)"
      d="m16.08 8.94c-0.98 0-1.57 1.03-1.57 2.3 0 1.36 0.71 2.66 1.62 3.14 0.79-0.78 1.72-1.41 2.6-1.84 0.01-1.92-1.32-3.6-2.65-3.6z"
    />
    <path
      fill="var(--possum-ground)"
      d="m26.95 10.4c-0.79 0.04-1.74 1.04-1.98 2 0.8 0.56 1.52 1.28 2.03 1.99 0.58-0.68 0.9-1.61 0.9-2.56 0.01-0.93-0.38-1.43-0.95-1.43z"
    />
    <ellipse
      cx="24.53"
      cy="18.91"
      fill="var(--possum-ground)"
      rx="1.805"
      ry="1.856"
    />
    <circle className="fill-foreground" cx="24.97" cy="18.52" r=".7659" />
    <ellipse
      cx="30.64"
      cy="23.08"
      fill="var(--possum-ground)"
      rx=".6618"
      ry=".8528"
      transform="rotate(39.09 30.64 23.08)"
    />
  </svg>
);
