import { useEffect, useRef } from "react";

/** Position-only DOM work while moving; React receives the final position once. */
export function useDrag(
  node: React.RefObject<HTMLDivElement | null>,
  size: { width: number; height: number; x: number; y: number },
  commit: (x: number, y: number) => void,
) {
  const latest = useRef({ size, commit });
  latest.current = { size, commit };
  const state = useRef<{
    pointer: number;
    target: HTMLElement;
    px: number;
    py: number;
    x: number;
    y: number;
  } | null>(null);
  const pending = useRef<{ x: number; y: number } | null>(null),
    frame = useRef(0);
  const position = useRef({ x: size.x, y: size.y });
  useEffect(() => {
    position.current = { x: size.x, y: size.y };
  }, [size.x, size.y]);
  const clamp = (x: number, y: number) => ({
    x: Math.round(Math.max(0, Math.min(500 - latest.current.size.width, x))),
    y: Math.round(Math.max(0, Math.min(480 - latest.current.size.height, y))),
  });
  const flush = () => {
    frame.current = 0;
    if (pending.current && node.current) {
      position.current = pending.current;
      node.current.style.transform = `translate(${position.current.x}px, ${position.current.y}px)`;
      pending.current = null;
    }
  };
  const finish = (event?: React.PointerEvent<HTMLDivElement>) => {
    const active = state.current;
    if (!active) return;
    if (event && event.pointerId !== active.pointer) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    flush();
    state.current = null;
    if (active.target.hasPointerCapture(active.pointer))
      active.target.releasePointerCapture(active.pointer);
    latest.current.commit(position.current.x, position.current.y);
  };
  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      const active = state.current;
      if (active?.target.hasPointerCapture(active.pointer))
        active.target.releasePointerCapture(active.pointer);
      state.current = null;
      pending.current = null;
    },
    [],
  );
  return {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      if (state.current || event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      state.current = {
        pointer: event.pointerId,
        target: event.currentTarget,
        px: event.clientX,
        py: event.clientY,
        ...position.current,
      };
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      const active = state.current;
      if (!active || event.pointerId !== active.pointer) return;
      pending.current = clamp(
        active.x + event.clientX - active.px,
        active.y + event.clientY - active.py,
      );
      if (!frame.current) frame.current = requestAnimationFrame(flush);
    },
    onPointerUp: finish,
    onPointerCancel: finish,
    onLostPointerCapture: finish,
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      const delta: Record<string, number[]> = {
        ArrowLeft: [-10, 0],
        ArrowRight: [10, 0],
        ArrowUp: [0, -10],
        ArrowDown: [0, 10],
      };
      if (!delta[event.key]) return;
      event.preventDefault();
      finish();
      const [dx, dy] = delta[event.key];
      pending.current = clamp(position.current.x + dx, position.current.y + dy);
      flush();
      latest.current.commit(position.current.x, position.current.y);
    },
  };
}
