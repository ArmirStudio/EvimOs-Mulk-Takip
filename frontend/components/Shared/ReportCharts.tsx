import React from 'react';
import { Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Polygon,
  Polyline,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

// ─── AreaChart ────────────────────────────────────────────────────────────────

export type AreaChartPoint = { label: string; value: number };

interface AreaChartProps {
  data: AreaChartPoint[];
  height?: number;
  color: string;
  gradientId: string;
  width?: number;
}

export function AreaChart({ data, height = 120, color, gradientId, width = 280 }: AreaChartProps) {
  if (!data || data.length === 0) return null;

  const paddingTop = 8;
  const paddingBottom = 24;
  const paddingH = 8;
  const chartH = height - paddingTop - paddingBottom;
  const chartW = width - paddingH * 2;

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 1);

  const toX = (i: number) =>
    paddingH + (i / Math.max(data.length - 1, 1)) * chartW;
  const toY = (v: number) =>
    paddingTop + chartH - (v / maxVal) * chartH;

  const linePoints = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');
  const lastX = toX(data.length - 1);
  const firstX = toX(0);
  const baseY = paddingTop + chartH;
  const areaPoints = `${linePoints} ${lastX},${baseY} ${firstX},${baseY}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      <Polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <Polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((d, i) => (
        <SvgText
          key={i}
          x={toX(i)}
          y={height - 4}
          fontSize="9"
          fill="#9CA3AF"
          textAnchor="middle"
        >
          {d.label}
        </SvgText>
      ))}
    </Svg>
  );
}

// ─── DonutChart ───────────────────────────────────────────────────────────────

export type DonutSegment = { value: number; color: string };

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSublabel?: string;
}

export function DonutChart({
  segments,
  size = 120,
  strokeWidth = 20,
  centerLabel,
  centerSublabel,
}: DonutChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  let cumulative = 0;
  const circles = segments.map((seg, i) => {
    const dash = (seg.value / total) * circumference;
    const gap = circumference - dash;
    const dashOffset = -cumulative;
    cumulative += dash;
    return (
      <Circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={dashOffset}
        rotation={-90}
        origin={`${cx}, ${cy}`}
        strokeLinecap="butt"
      />
    );
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {circles}
      </Svg>
      {(centerLabel || centerSublabel) && (
        <View style={{ alignItems: 'center' }}>
          {centerLabel ? (
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937', textAlign: 'center' }}>
              {centerLabel}
            </Text>
          ) : null}
          {centerSublabel ? (
            <Text style={{ fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 1 }}>
              {centerSublabel}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ─── ArcScore ─────────────────────────────────────────────────────────────────

interface ArcScoreProps {
  score: number;
  size?: number;
  successColor?: string;
  warningColor?: string;
  errorColor?: string;
}

export function ArcScore({
  score,
  size = 140,
  successColor = '#059669',
  warningColor = '#D97706',
  errorColor = '#DC2626',
}: ArcScoreProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const strokeW = Math.round(size * 0.1);
  const r = (size - strokeW) / 2 - 4;
  const cx = size / 2;
  // cy positioned so top of arc has padding, bottom aligns with container
  const cy = r + strokeW / 2 + 4;
  const svgH = cy + strokeW / 2 + 8;

  const arcColor =
    clamped >= 70 ? successColor : clamped >= 40 ? warningColor : errorColor;

  // Upper semicircle: start left (cx-r, cy) → end right (cx+r, cy), sweep upward
  // SVG arc: A rx ry x-rotation large-arc-flag sweep-flag x y
  // sweep-flag=0 → counterclockwise in SVG (= upward) gives upper semicircle
  const bgStartX = cx - r;
  const bgEndX = cx + r;

  // Foreground partial arc
  // angleFraction goes from 0 (start=left) to 1 (end=right)
  const frac = clamped / 100;
  // Standard math angle: starts at 180°, sweeps to 0° (counterclockwise)
  const mathAngle = Math.PI * (1 - frac); // 180° when frac=0, 0° when frac=1
  const fgEndX = cx + r * Math.cos(mathAngle);
  const fgEndY = cy - r * Math.sin(mathAngle); // minus because SVG y is flipped

  // large-arc-flag=1 when we've passed 50% (the arc is longer than a quarter)
  const largeArc = frac > 0.5 ? 1 : 0;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={svgH}>
        {/* Background track */}
        <Path
          d={`M ${bgStartX} ${cy} A ${r} ${r} 0 0 0 ${bgEndX} ${cy}`}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Score fill */}
        {clamped > 0 && (
          <Path
            d={`M ${bgStartX} ${cy} A ${r} ${r} 0 ${largeArc} 0 ${fgEndX} ${fgEndY}`}
            fill="none"
            stroke={arcColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        )}
        {/* Score label centred below arc midpoint */}
        <SvgText
          x={cx}
          y={cy + 2}
          fontSize={size * 0.19}
          fontWeight="700"
          fill={arcColor}
          textAnchor="middle"
        >
          {Math.round(clamped)}%
        </SvgText>
      </Svg>
    </View>
  );
}
