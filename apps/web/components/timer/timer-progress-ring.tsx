"use client";

import type { ReactNode } from "react";

interface TimerProgressRingProps {
  progress: number;
  pulseActive?: boolean;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  children?: ReactNode;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function TimerProgressRing({
  progress,
  pulseActive = true,
  size = 138,
  strokeWidth = 10,
  trackColor = "rgba(93,110,86,0.14)",
  progressColor = "rgba(93,110,86,0.95)",
  children,
}: TimerProgressRingProps) {
  const normalized = clamp(progress, 0, 1);
  const normalizedForArc = Math.min(normalized, 0.9999);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - normalized);
  const center = size / 2;

  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + 2 * Math.PI * normalizedForArc;
  const startX = center + radius * Math.cos(startAngle);
  const startY = center + radius * Math.sin(startAngle);
  const endX = center + radius * Math.cos(endAngle);
  const endY = center + radius * Math.sin(endAngle);
  const largeArcFlag = normalizedForArc > 0.5 ? 1 : 0;
  const sweepFlag = 1;
  const glowSegment = clamp(Math.round(normalizedForArc * 42), 10, 24);
  const glowGap = Math.max(100 - glowSegment, 1);
  const glowPath =
    normalized > 0
      ? `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`
      : "";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={Math.max(2, strokeWidth - 2)}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          strokeOpacity={0.22}
        />
        {normalized > 0 && pulseActive && (
          <path
            d={glowPath}
            fill="none"
            stroke="rgba(255,255,255,0.34)"
            strokeWidth={Math.max(3, strokeWidth - 4)}
            strokeLinecap="round"
            filter="url(#timer-ring-shimmer)"
            pathLength={100}
            strokeDasharray={`${glowSegment} ${glowGap}`}
            className="timer-ring-travel-glow"
          />
        )}
        <defs>
          <filter id="timer-ring-shimmer" x="-250%" y="-250%" width="600%" height="600%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="softGlow" />
            <feMerge>
              <feMergeNode in="softGlow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      <style>{`
        .timer-ring-travel-glow {
          animation: timer-ring-travel-glow 4.8s linear infinite;
          opacity: 0.95;
        }

        @keyframes timer-ring-travel-glow {
          from {
            stroke-dashoffset: 100;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
