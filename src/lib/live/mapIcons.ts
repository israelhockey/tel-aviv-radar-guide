// Map icons drawn on a canvas at runtime, so they're crisp at any pixel ratio and need no sprite files.

const draw = (size: number, paint: (ctx: CanvasRenderingContext2D, s: number) => void) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  paint(ctx, size);
  return { width: size, height: size, data: new Uint8Array(ctx.getImageData(0, 0, size, size).data.buffer) };
};

// A bus: a filled disc with a small chevron showing its heading (icon points north at 0°).
export const busIcon = (fill: string) =>
  draw(44, (ctx, s) => {
    const c = s / 2;
    ctx.beginPath();
    ctx.moveTo(c, 2);
    ctx.lineTo(c + 7, 12);
    ctx.lineTo(c - 7, 12);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c, c + 2, 13, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  });

// An aircraft silhouette pointing north.
export const planeIcon = (fill: string) =>
  draw(56, (ctx, s) => {
    const k = s / 24;
    ctx.save();
    ctx.scale(k, k);
    const p = new Path2D(
      "M12 1.5c.8 0 1.4.9 1.4 2v5.6l8.1 4.7v2.1l-8.1-2.4v4.6l2.4 1.8v1.7L12 20.6l-3.8 1V19.9l2.4-1.8v-4.6l-8.1 2.4v-2.1l8.1-4.7V3.5c0-1.1.6-2 1.4-2z",
    );
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#ffffff";
    ctx.lineJoin = "round";
    ctx.stroke(p);
    ctx.fillStyle = fill;
    ctx.fill(p);
    ctx.restore();
  });
