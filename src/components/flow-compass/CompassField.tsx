'use client';

import type { CSSProperties, PointerEvent } from 'react';
import type { CompassPoint } from '@/types/flow-compass';
import styles from './flow-compass.module.css';

type CompassMode = 'observe' | 'locate' | 'compress' | 'reorient' | 'record';

interface CompassFieldProps {
  center: CompassPoint;
  compression: number;
  orientation: number;
  mode: CompassMode;
  pressing?: boolean;
  onCenterChange?: (point: CompassPoint) => void;
}

const mapPoint = (value: number) => 36 + value * 2.88;

export default function CompassField({
  center,
  compression,
  orientation,
  mode,
  pressing = false,
  onCenterChange,
}: CompassFieldProps) {
  const centerX = mapPoint(center.x);
  const centerY = mapPoint(center.y);
  const density = pressing ? Math.min(100, compression + 28) : compression;
  const orbitRadius = 60 - density * 0.32;
  const nodeRadius = 6 + density * 0.055;
  const isInteractive = mode === 'locate' && Boolean(onCenterChange);

  const updatePoint = (event: PointerEvent<SVGSVGElement>) => {
    if (!isInteractive || (event.type === 'pointermove' && event.buttons === 0)) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    onCenterChange?.({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
  };

  const fieldStyle = {
    '--compass-rotation': `${orientation}deg`,
  } as CSSProperties;

  return (
    <div
      className={`${styles.fieldShell} ${pressing ? styles.fieldPressing : ''}`}
      data-mode={mode}
      style={fieldStyle}
    >
      <svg
        className={`${styles.compassField} ${isInteractive ? styles.fieldInteractive : ''}`}
        viewBox="0 0 360 360"
        role={isInteractive ? 'application' : 'img'}
        aria-label={
          isInteractive
            ? '身体のどこに中心を感じるか、触れて位置を選ぶフィールド'
            : '選んだ中心、循環、向きを表す幾何学フィールド'
        }
        onPointerDown={(event) => {
          if (isInteractive) event.currentTarget.setPointerCapture(event.pointerId);
          updatePoint(event);
        }}
        onPointerMove={updatePoint}
      >
        <defs>
          <radialGradient id="field-depth" cx="50%" cy="48%" r="56%">
            <stop offset="0%" stopColor="#e7fff5" stopOpacity="0.075" />
            <stop offset="58%" stopColor="#9ae5ca" stopOpacity="0.018" />
            <stop offset="100%" stopColor="#050d13" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="axis-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b97a5" stopOpacity="0.08" />
            <stop offset="0.5" stopColor="#d9fff0" stopOpacity="0.6" />
            <stop offset="1" stopColor="#8b97a5" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="orbit-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#9ce9cc" stopOpacity="0.12" />
            <stop offset="0.5" stopColor="#e5b978" stopOpacity="0.72" />
            <stop offset="1" stopColor="#9ce9cc" stopOpacity="0.12" />
          </linearGradient>
          <filter id="node-shadow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#05090c" floodOpacity="0.82" />
          </filter>
        </defs>

        <rect width="360" height="360" fill="url(#field-depth)" />
        <circle className={styles.guideRing} cx="180" cy="180" r="132" />
        <circle className={styles.guideRing} cx="180" cy="180" r="92" />
        <circle className={styles.guideRingStrong} cx="180" cy="180" r="48" />

        <g className={styles.bodyMap} aria-hidden="true">
          <circle cx="180" cy="74" r="24" />
          <path d="M180 99 C141 99 131 138 137 178 C142 216 153 248 180 300 C207 248 218 216 223 178 C229 138 219 99 180 99Z" />
          <path d="M137 143 L95 236 M223 143 L265 236" />
        </g>

        <g className={styles.rotatingAxis} style={{ transform: `rotate(${orientation}deg)` }}>
          <line x1="28" y1="180" x2="332" y2="180" stroke="url(#axis-line)" />
          <line x1="180" y1="28" x2="180" y2="332" stroke="url(#axis-line)" />
          <path d="M180 25 L175 36 L185 36 Z" className={styles.axisMarker} />
          <path d="M335 180 L324 175 L324 185 Z" className={styles.axisMarker} />
        </g>

        <g
          className={styles.nodeSystem}
          style={{ transform: `translate(${centerX}px, ${centerY}px) rotate(${orientation}deg)` }}
        >
          {[0, 45, 90, 135].map((rotation) => (
            <ellipse
              key={rotation}
              className={styles.petal}
              cx="0"
              cy="0"
              rx={orbitRadius * 0.48}
              ry={orbitRadius}
              transform={`rotate(${rotation})`}
            />
          ))}
          <ellipse
            className={styles.orbitPrimary}
            cx="0"
            cy="0"
            rx={orbitRadius * 1.38}
            ry={orbitRadius * 0.48}
          />
          <ellipse
            className={styles.orbitSecondary}
            cx="0"
            cy="0"
            rx={orbitRadius * 0.48}
            ry={orbitRadius * 1.38}
          />
          <circle className={styles.receptacle} cx="0" cy="0" r={nodeRadius + 7} />
          <circle
            className={styles.centerNode}
            cx="0"
            cy="0"
            r={nodeRadius}
            filter="url(#node-shadow)"
          />
          <circle className={styles.centerCore} cx="0" cy="0" r="2.4" />
        </g>
      </svg>
      {isInteractive && <span className={styles.fieldHint}>TAP OR DRAG</span>}
    </div>
  );
}
