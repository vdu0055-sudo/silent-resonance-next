import type { CSSProperties, MouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildStarAppearance,
  type VisualStar,
  withAlpha,
} from '../lib/universe-visuals';
import ResonanceAction from './resonance-action';
import StarDetailTooltip from './star-detail-tooltip';

type UniverseCanvasProps = {
  stars: VisualStar[];
  onResonanceSent?: (star: VisualStar) => void;
  onUserStarClick?: (star: VisualStar) => void;
  onEncounterShift?: (step: number) => void;
  externalResonance?: {
    id: string;
    fromStarId: string;
    toStarId: string;
  } | null;
  onExternalResonancePlayed?: (id: string) => void;
};

type ResonanceWave = {
  id: string;
  source: { x: number; y: number };
  target: { x: number; y: number };
  angleDeg: number;
  distance: number;
  sourcePulseRadius: number;
  lineStart: number;
  lineLength: number;
  lineAmplitude: number;
  fanSpread: number;
  lineDuration: number;
  fanDelay: number;
  fanDuration: number;
  resonanceDelay: number;
  resonanceDuration: number;
  sourceColor: string;
  targetColor: string;
};

type CSSVariables = CSSProperties & Record<string, string | number>;

type MotionState = {
  viewportWidth: number;
  viewportHeight: number;
  cameraX: number;
  cameraY: number;
  selfLeadX: number;
  selfLeadY: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function wrapWithinRange(value: number, min: number, max: number) {
  const range = max - min;

  if (range <= 0) {
    return min;
  }

  return ((((value - min) % range) + range) % range) + min;
}

function buildElectroLinePath(startX: number, endX: number, amplitude: number) {
  const length = endX - startX;
  const points = [
    { x: startX, y: 0 },
    { x: startX + length * 0.14, y: -amplitude * 0.92 },
    { x: startX + length * 0.28, y: amplitude * 0.68 },
    { x: startX + length * 0.44, y: -amplitude * 0.56 },
    { x: startX + length * 0.6, y: amplitude * 0.42 },
    { x: startX + length * 0.78, y: -amplitude * 0.26 },
    { x: endX, y: 0 },
  ];

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} Q ${controlX} ${previous.y} ${point.x} ${point.y}`;
  }, '');
}

function buildFanFlowPath(length: number, spread: number, offsetRatio: number) {
  const startX = 10;
  const endX = Math.max(startX + 48, length - 14);
  const offset = spread * offsetRatio;

  return [
    `M ${startX} 0`,
    `C ${length * 0.24} ${offset * 1.06} ${length * 0.68} ${offset * 1.24} ${endX} ${offset * 0.16}`,
  ].join(' ');
}

function renderResonanceBurst({
  center,
  color,
  gradientId,
  delay,
  bloomRadius,
  ringBaseRadius,
  intensity = 1,
  bloomDuration = 900,
  ringDuration = 920,
  ringLag = 110,
}: {
  center: { x: number; y: number };
  color: string;
  gradientId: string;
  delay: number;
  bloomRadius: number;
  ringBaseRadius: number;
  intensity?: number;
  bloomDuration?: number;
  ringDuration?: number;
  ringLag?: number;
}) {
  return (
    <g transform={`translate(${center.x} ${center.y})`}>
      <circle r={bloomRadius} fill={`url(#${gradientId})`} opacity="0">
        <animate
          attributeName="opacity"
          values={`0;${0.72 * intensity};0`}
          keyTimes="0;0.2;1"
          begin={`${delay}ms`}
          dur={`${bloomDuration}ms`}
          fill="freeze"
        />
        <animateTransform
          attributeName="transform"
          type="scale"
          values="0.28;1.02;1.56"
          keyTimes="0;0.34;1"
          begin={`${delay}ms`}
          dur={`${bloomDuration}ms`}
          fill="freeze"
        />
      </circle>

      {[0, 1, 2].map((ring) => {
        const begin = delay + ring * ringLag;
        const radius = ringBaseRadius + ring * 10;
        const strokeOpacity = (ring === 0 ? 0.28 : ring === 1 ? 0.16 : 0.08) * intensity;

        return (
          <circle
            key={ring}
            r={radius}
            fill="none"
            stroke={withAlpha(color, strokeOpacity)}
            strokeWidth={ring === 0 ? 1.2 : 0.85}
            opacity="0"
          >
            <animate
              attributeName="opacity"
              values={`0;${strokeOpacity};0`}
              keyTimes="0;0.18;1"
              begin={`${begin}ms`}
              dur={`${ringDuration + ring * 220}ms`}
              fill="freeze"
            />
            <animateTransform
              attributeName="transform"
              type="scale"
              values="0.24;1;1.94"
              keyTimes="0;0.28;1"
              begin={`${begin}ms`}
              dur={`${ringDuration + ring * 220}ms`}
              fill="freeze"
            />
          </circle>
        );
      })}
    </g>
  );
}

export default function UniverseCanvas({
  stars,
  onResonanceSent = () => {},
  onUserStarClick = () => {},
  onEncounterShift = () => {},
  externalResonance = null,
  onExternalResonancePlayed = () => {},
}: UniverseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragInputRef = useRef({ x: 0, y: 0 });
  const dragStateRef = useRef({
    active: false,
    pointerId: null as number | null,
    lastX: 0,
    lastY: 0,
    draggedDistance: 0,
    suppressClickUntil: 0,
  });
  const starRefs = useRef(new Map<string, HTMLButtonElement>());
  const resonanceTimeoutRef = useRef<number | null>(null);
  const waveSequenceRef = useRef(0);
  const encounterStepRef = useRef(0);
  const motionRef = useRef({
    travelX: 0,
    travelY: 0,
    velocityX: 0,
    velocityY: 0,
    cameraX: 0,
    cameraY: 0,
    selfLeadX: 0,
    selfLeadY: 0,
    explorationDistance: 0,
  });
  const [hoveredStar, setHoveredStar] = useState<VisualStar | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [activeStar, setActiveStar] = useState<VisualStar | null>(null);
  const [actionPosition, setActionPosition] = useState({ x: 0, y: 0 });
  const [resonanceWave, setResonanceWave] = useState<ResonanceWave | null>(null);
  const [motion, setMotion] = useState<MotionState>({
    viewportWidth: 1280,
    viewportHeight: 720,
    cameraX: 0,
    cameraY: 0,
    selfLeadX: 0,
    selfLeadY: 0,
  });

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;

      if (!dragState.active || dragState.pointerId !== event.pointerId) {
        return;
      }

      const width = Math.max(window.innerWidth * 0.16, 120);
      const height = Math.max(window.innerHeight * 0.16, 120);
      const deltaX = event.clientX - dragState.lastX;
      const deltaY = event.clientY - dragState.lastY;

      dragState.lastX = event.clientX;
      dragState.lastY = event.clientY;
      dragState.draggedDistance += Math.hypot(deltaX, deltaY);
      dragInputRef.current = {
        x: clamp(deltaX / width, -1.25, 1.25),
        y: clamp(deltaY / height, -1.25, 1.25),
      };
    };

    const handlePointerStop = (event: PointerEvent) => {
      const dragState = dragStateRef.current;

      if (!dragState.active || dragState.pointerId !== event.pointerId) {
        return;
      }

      if (dragState.draggedDistance > 8) {
        dragState.suppressClickUntil = performance.now() + 180;
      }

      dragState.active = false;
      dragState.pointerId = null;
      dragState.draggedDistance = 0;
      dragInputRef.current = { x: 0, y: 0 };
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerStop);
    window.addEventListener('pointercancel', handlePointerStop);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerStop);
      window.removeEventListener('pointercancel', handlePointerStop);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    let animationFrameId = 0;
    let previousTime = 0;
    const points = Array.from({ length: 150 }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: Math.random() > 0.82 ? Math.random() * 1.6 + 1 : Math.random() * 1.15 + 0.3,
      alpha: Math.random() * 0.38 + 0.04,
      driftX: (Math.random() - 0.5) * 0.00003,
      driftY: (Math.random() - 0.5) * 0.000024,
      phase: Math.random() * Math.PI * 2,
      depth: Math.random() * 0.8 + 0.3,
    }));
    const haze = Array.from({ length: 6 }, () => ({
      x: Math.random(),
      y: Math.random(),
      radiusX: Math.random() * 260 + 240,
      radiusY: Math.random() * 160 + 140,
      alpha: Math.random() * 0.06 + 0.03,
      color: Math.random() > 0.5 ? '96, 123, 171' : '124, 102, 151',
      tilt: (Math.random() - 0.5) * 0.7,
      speed: Math.random() * 0.00006 + 0.00003,
    }));
    const currents = Array.from({ length: 3 }, () => ({
      x: Math.random() * 0.4 + 0.3,
      y: Math.random() * 0.28 + 0.2,
      radiusX: Math.random() * 220 + 340,
      radiusY: Math.random() * 80 + 110,
      alpha: Math.random() * 0.04 + 0.02,
      color: Math.random() > 0.5 ? '142, 166, 201' : '98, 128, 176',
      tilt: (Math.random() - 0.5) * 0.55,
      speed: Math.random() * 0.00004 + 0.00002,
    }));

    const drawEllipseGlow = (x: number, y: number, radiusX: number, radiusY: number, color: string) => {
      context.save();
      context.translate(x, y);
      context.scale(1, radiusY / radiusX);
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radiusX);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(0, 0, radiusX, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      setMotion((current) => ({
        ...current,
        viewportWidth: width,
        viewportHeight: height,
      }));
    };

    const render = (time: number) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const delta = previousTime ? Math.min(32, time - previousTime) : 16.7;
      previousTime = time;
      const dragInputX = dragInputRef.current.x;
      const dragInputY = dragInputRef.current.y;
      const motionState = motionRef.current;

      const previousTravelX = motionState.travelX;
      const previousTravelY = motionState.travelY;

      motionState.velocityX =
        motionState.velocityX * Math.pow(0.84, delta / 16.7) + dragInputX * delta * 0.75;
      motionState.velocityY =
        motionState.velocityY * Math.pow(0.84, delta / 16.7) + dragInputY * delta * 0.72;
      motionState.travelX += motionState.velocityX;
      motionState.travelY += motionState.velocityY;
      motionState.explorationDistance += Math.hypot(
        motionState.travelX - previousTravelX,
        motionState.travelY - previousTravelY,
      );
      motionState.cameraX += (motionState.travelX - motionState.cameraX) * 0.07;
      motionState.cameraY += (motionState.travelY - motionState.cameraY) * 0.07;
      motionState.selfLeadX += (dragInputX * 14 - motionState.selfLeadX) * 0.14;
      motionState.selfLeadY += (dragInputY * 12 - motionState.selfLeadY) * 0.14;
      dragInputRef.current.x *= Math.pow(0.42, delta / 16.7);
      dragInputRef.current.y *= Math.pow(0.42, delta / 16.7);

      const encounterStep = Math.floor(motionState.explorationDistance / 420);

      if (encounterStep !== encounterStepRef.current) {
        encounterStepRef.current = encounterStep;
        onEncounterShift(encounterStep);
      }

      const parallaxX = motionState.cameraX * 0.28 + motionState.selfLeadX * 0.92;
      const parallaxY = motionState.cameraY * 0.24 + motionState.selfLeadY * 0.88;

      context.clearRect(0, 0, width, height);

      currents.forEach((current, index) => {
        context.save();
        context.translate(
          current.x * width + parallaxX * (0.12 + index * 0.04),
          current.y * height + parallaxY * (0.08 + index * 0.04),
        );
        context.rotate(current.tilt + Math.sin(time * current.speed + index) * 0.06);
        drawEllipseGlow(0, 0, current.radiusX, current.radiusY, `rgba(${current.color}, ${current.alpha})`);
        context.restore();
      });

      haze.forEach((cloud, index) => {
        context.save();
        context.translate(
          cloud.x * width + parallaxX * (0.18 + index * 0.03),
          cloud.y * height + parallaxY * (0.14 + index * 0.02),
        );
        context.rotate(cloud.tilt + Math.sin(time * cloud.speed + index) * 0.08);
        drawEllipseGlow(
          0,
          0,
          cloud.radiusX,
          cloud.radiusY,
          `rgba(${cloud.color}, ${cloud.alpha + Math.sin(time * 0.00013 + index) * 0.008})`,
        );
        context.restore();
      });

      drawEllipseGlow(
        width * 0.5 + parallaxX * 0.2,
        height * 0.36 + parallaxY * 0.18,
        Math.min(width, height) * 0.38,
        Math.min(width, height) * 0.2,
        'rgba(130, 154, 194, 0.07)',
      );

      points.forEach((point) => {
        point.x = (point.x + point.driftX + 1) % 1;
        point.y = (point.y + point.driftY + 1) % 1;
        const alpha =
          point.alpha *
          (0.66 + (Math.sin(time * (0.00022 + point.depth * 0.0001) + point.phase) + 1) * 0.22);
        const x = wrapWithinRange(
          point.x * width + parallaxX * point.depth * 0.85,
          0,
          width,
        );
        const y = wrapWithinRange(
          point.y * height + parallaxY * point.depth * 0.72,
          0,
          height,
        );

        if (point.radius > 1.1) {
          const glow = context.createRadialGradient(x, y, 0, x, y, point.radius * 8);
          glow.addColorStop(0, `rgba(214, 225, 245, ${alpha * 0.85})`);
          glow.addColorStop(1, 'rgba(214, 225, 245, 0)');
          context.fillStyle = glow;
          context.beginPath();
          context.arc(x, y, point.radius * 8, 0, Math.PI * 2);
          context.fill();
        }

        context.beginPath();
        context.fillStyle = `rgba(223, 232, 247, ${alpha})`;
        context.arc(x, y, point.radius, 0, Math.PI * 2);
        context.fill();
      });

      setMotion({
        viewportWidth: width,
        viewportHeight: height,
        cameraX: motionState.cameraX,
        cameraY: motionState.cameraY,
        selfLeadX: motionState.selfLeadX,
        selfLeadY: motionState.selfLeadY,
      });

      animationFrameId = window.requestAnimationFrame(render);
    };

    resize();
    animationFrameId = window.requestAnimationFrame(render);
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [onEncounterShift]);

  useEffect(() => {
    const clearAction = () => {
      setActiveStar(null);
      setResonanceWave(null);
    };

    window.addEventListener('resize', clearAction);
    return () => window.removeEventListener('resize', clearAction);
  }, []);

  useEffect(() => {
    return () => {
      if (resonanceTimeoutRef.current) {
        window.clearTimeout(resonanceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeStar && !stars.some((star) => star.id === activeStar.id)) {
      setActiveStar(null);
    }

    if (hoveredStar && !stars.some((star) => star.id === hoveredStar.id)) {
      setHoveredStar(null);
    }
  }, [activeStar, hoveredStar, stars]);

  const getStarCenter = useCallback((starId: string) => {
    const node = starRefs.current.get(starId);
    if (!node) {
      return null;
    }

    const rect = node.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, []);

  const startResonanceWave = useCallback((sourceStar: VisualStar, targetStar: VisualStar) => {
    const source = getStarCenter(sourceStar.id);
    const target = getStarCenter(targetStar.id);

    if (!source || !target) {
      return false;
    }

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 24) {
      return false;
    }

    const sourceAppearance = buildStarAppearance(sourceStar);
    const targetAppearance = buildStarAppearance(targetStar);
    const sourcePulseRadius = clamp(distance * 0.14, 34, 86);
    const lineStart = clamp(sourcePulseRadius * 0.36, 12, 26);
    const lineLength = Math.max(lineStart + 56, distance - 12);
    const lineAmplitude = clamp(distance * 0.017, 4, 9);
    const fanSpread = clamp(distance * 0.11, 44, 128);
    const lineDuration = clamp(distance * 2.3, 680, 1020);
    const fanDelay = lineDuration + 120;
    const fanDuration = clamp(distance * 3.2, 1100, 1620);
    const resonanceDelay = fanDelay + fanDuration + 40;
    const resonanceDuration = 1280;

    waveSequenceRef.current += 1;

    setResonanceWave({
      id: `wave-${waveSequenceRef.current}`,
      source,
      target,
      angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
      distance,
      sourcePulseRadius,
      lineStart,
      lineLength,
      lineAmplitude,
      fanSpread,
      lineDuration,
      fanDelay,
      fanDuration,
      resonanceDelay,
      resonanceDuration,
      sourceColor: sourceAppearance.primary.color,
      targetColor: targetAppearance.primary.color,
    });

    if (resonanceTimeoutRef.current) {
      window.clearTimeout(resonanceTimeoutRef.current);
    }

    resonanceTimeoutRef.current = window.setTimeout(() => {
      setResonanceWave(null);
    }, resonanceDelay + resonanceDuration + 700);

    return true;
  }, [getStarCenter]);

  const handleStarEnter = (star: VisualStar, event: MouseEvent<HTMLButtonElement>) => {
    setHoveredStar(star);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleStarMove = (event: MouseEvent<HTMLButtonElement>) => {
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleStarClick = (star: VisualStar, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (dragStateRef.current.suppressClickUntil > performance.now()) {
      return;
    }

    if (star.isUser) {
      onUserStarClick(star);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setActiveStar(star);
    setActionPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleResonate = () => {
    if (!activeStar) {
      return;
    }

    const sourceStar = stars.find((star) => star.isUser);
    const targetStar = activeStar;
    setActiveStar(null);

    if (!sourceStar) {
      onResonanceSent(targetStar);
      return;
    }

    startResonanceWave(sourceStar, targetStar);
    onResonanceSent(targetStar);
  };

  useEffect(() => {
    if (!externalResonance) {
      return;
    }

    const sourceStar = stars.find((star) => star.id === externalResonance.fromStarId);
    const targetStar = stars.find((star) => star.id === externalResonance.toStarId);

    if (!sourceStar || !targetStar) {
      return;
    }

    if (startResonanceWave(sourceStar, targetStar)) {
      onExternalResonancePlayed(externalResonance.id);
    }
  }, [externalResonance, onExternalResonancePlayed, startResonanceWave, stars]);

  const renderStars = stars.map((star, index) => {
    if (star.isUser) {
      return {
        star,
        left: '50%',
        top: '50%',
        pilotOffsetX: motion.selfLeadX,
        pilotOffsetY: motion.selfLeadY,
      };
    }

    const width = motion.viewportWidth;
    const height = motion.viewportHeight;
    const minX = width * 0.14;
    const maxX = width * 0.86;
    const minY = height * 0.16;
    const maxY = height * 0.84;
    const baseX = minX + ((star.position.x - 8) / 84) * (maxX - minX);
    const baseY = minY + ((star.position.y - 10) / 78) * (maxY - minY);
    const travelFactor = 0.34 + index * 0.11;
    let x = wrapWithinRange(baseX - motion.cameraX * travelFactor, minX, maxX);
    let y = wrapWithinRange(baseY - motion.cameraY * (travelFactor * 0.92), minY, maxY);
    const dx = x - width / 2;
    const dy = y - height / 2;
    const minDistance = Math.min(width, height) * 0.19;
    const distance = Math.hypot(dx, dy);

    if (distance < minDistance) {
      const fallbackAngle = index % 2 === 0 ? -0.72 : 0.88;
      const angle = distance > 0 ? Math.atan2(dy, dx) : fallbackAngle;
      x = width / 2 + Math.cos(angle) * minDistance;
      y = height / 2 + Math.sin(angle) * minDistance;
    }

    return {
      star,
      left: `${(x / width) * 100}%`,
      top: `${(y / height) * 100}%`,
      pilotOffsetX: 0,
      pilotOffsetY: 0,
    };
  });

  return (
    <div
      className="absolute inset-0 touch-none"
      onClick={() => {
        if (dragStateRef.current.suppressClickUntil > performance.now()) {
          return;
        }

        setActiveStar(null);
      }}
      onPointerDown={(event) => {
        dragStateRef.current.active = true;
        dragStateRef.current.pointerId = event.pointerId;
        dragStateRef.current.lastX = event.clientX;
        dragStateRef.current.lastY = event.clientY;
        dragStateRef.current.draggedDistance = 0;
        dragInputRef.current = { x: 0, y: 0 };
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-95" />

      <div className="absolute inset-0">
        {renderStars.map(({ star, left, top, pilotOffsetX, pilotOffsetY }) => {
          const appearance = buildStarAppearance(star);
          const coreSize = Math.max(7, star.size * 0.76);
          const shellSize = Math.max(16, star.size * 1.55);
          const haloSize = Math.max(34, star.size * 3.2);
          const auraSize = Math.max(54, star.size * 4.7);
          const userShellSize = Math.max(58, star.size * 4.1);

          const style = {
            left,
            top,
            width: `${auraSize}px`,
            height: `${auraSize}px`,
            '--star-color': appearance.primary.color,
            '--star-core-glow': appearance.coreGlow,
            '--star-halo-glow': appearance.haloGlow,
            '--ring-color': appearance.ringColor,
            '--ring-glow': appearance.ringGlow,
            '--ripple-duration': `${appearance.primary.ripple}s`,
            '--pulse-duration': `${appearance.pulseDuration}s`,
            '--halo-duration': `${appearance.haloDuration}s`,
            '--pulse-scale': appearance.pulseScale,
            '--halo-scale': appearance.haloScale,
            '--aura-opacity': appearance.auraOpacity,
            '--shell-opacity': appearance.shellOpacity,
            '--ripple-scale': appearance.rippleScale,
            '--ripple-opacity': appearance.rippleOpacity,
            '--sheen-duration': `${appearance.sheenDuration}s`,
            '--drift-mid-x': `${star.drift.x}px`,
            '--drift-mid-y': `${star.drift.y}px`,
            '--drift-start-x': `${Math.round(star.drift.x * -0.45)}px`,
            '--drift-start-y': `${Math.round(star.drift.y * -0.45)}px`,
            '--drift-delay': star.delay,
            '--drift-duration': `${(30 + star.size * 0.9) * appearance.driftFactor}s`,
            '--pilot-offset-x': `${pilotOffsetX}px`,
            '--pilot-offset-y': `${pilotOffsetY}px`,
          } as CSSVariables;

          return (
            <button
              key={star.id}
              type="button"
              aria-label={`${appearance.primary.label}频率`}
              ref={(node) => {
                if (node) {
                  starRefs.current.set(star.id, node);
                } else {
                  starRefs.current.delete(star.id);
                }
              }}
              className={`star-node group absolute cursor-pointer rounded-full transition duration-700 ${
                star.isUser ? 'z-30' : 'z-20'
              }`}
              style={style}
              onMouseEnter={(event) => handleStarEnter(star, event)}
              onMouseMove={handleStarMove}
              onMouseLeave={() => setHoveredStar(null)}
              onClick={(event) => handleStarClick(star, event)}
            >
              <span
                className="star-aura absolute left-1/2 top-1/2 rounded-full"
                style={{ width: `${auraSize}px`, height: `${auraSize}px` }}
              />
              <span
                className="star-halo absolute left-1/2 top-1/2 rounded-full"
                style={{ width: `${haloSize}px`, height: `${haloSize}px` }}
              />
              <span
                className="star-shell absolute left-1/2 top-1/2 rounded-full"
                style={{ width: `${shellSize}px`, height: `${shellSize}px` }}
              />
              <span
                className="star-sheen absolute left-1/2 top-1/2 rounded-full"
                style={{ width: `${shellSize * 1.4}px`, height: `${shellSize * 1.4}px` }}
              />
              <span
                className="star-core absolute left-1/2 top-1/2 rounded-full"
                style={{ width: `${coreSize}px`, height: `${coreSize}px` }}
              />

              {[0, 1, 2, 3].map((ring) => (
                <span
                  key={ring}
                  className="ripple-ring absolute left-1/2 top-1/2 rounded-full border"
                  style={{
                    width: `${shellSize}px`,
                    height: `${shellSize}px`,
                    animationDelay: `${ring * (appearance.primary.ripple / 4.1)}s`,
                  }}
                />
              ))}

              {star.isUser ? (
                <span
                  className="user-star-shell absolute left-1/2 top-1/2 rounded-full"
                  style={{ width: `${userShellSize}px`, height: `${userShellSize}px` }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {resonanceWave ? (
        <svg key={resonanceWave.id} className="pointer-events-none absolute inset-0 z-40 h-full w-full overflow-visible">
          <defs>
            <radialGradient id={`resonance-source-bloom-${resonanceWave.id}`}>
              <stop offset="0%" stopColor={withAlpha(resonanceWave.sourceColor, 0.7)} />
              <stop offset="50%" stopColor={withAlpha(resonanceWave.sourceColor, 0.18)} />
              <stop offset="100%" stopColor={withAlpha(resonanceWave.sourceColor, 0)} />
            </radialGradient>
            <radialGradient id={`resonance-target-bloom-${resonanceWave.id}`}>
              <stop offset="0%" stopColor={withAlpha(resonanceWave.targetColor, 0.84)} />
              <stop offset="54%" stopColor={withAlpha(resonanceWave.targetColor, 0.24)} />
              <stop offset="100%" stopColor={withAlpha(resonanceWave.targetColor, 0)} />
            </radialGradient>
            <linearGradient
              id={`resonance-line-${resonanceWave.id}`}
              gradientUnits="userSpaceOnUse"
              x1={resonanceWave.lineStart}
              y1="0"
              x2={resonanceWave.lineLength}
              y2="0"
            >
              <stop offset="0%" stopColor={withAlpha(resonanceWave.sourceColor, 0.08)} />
              <stop offset="28%" stopColor={withAlpha(resonanceWave.sourceColor, 0.8)} />
              <stop offset="74%" stopColor={withAlpha(resonanceWave.targetColor, 0.92)} />
              <stop offset="100%" stopColor={withAlpha(resonanceWave.targetColor, 0.2)} />
            </linearGradient>
            <linearGradient
              id={`resonance-flow-${resonanceWave.id}`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2={resonanceWave.distance}
              y2="0"
            >
              <stop offset="0%" stopColor={withAlpha(resonanceWave.sourceColor, 0.22)} />
              <stop offset="42%" stopColor={withAlpha(resonanceWave.sourceColor, 0.46)} />
              <stop offset="100%" stopColor={withAlpha(resonanceWave.targetColor, 0.88)} />
            </linearGradient>
            <radialGradient id={`resonance-particle-${resonanceWave.id}`}>
              <stop offset="0%" stopColor={withAlpha(resonanceWave.targetColor, 1)} />
              <stop offset="44%" stopColor={withAlpha(resonanceWave.targetColor, 0.54)} />
              <stop offset="100%" stopColor={withAlpha(resonanceWave.targetColor, 0)} />
            </radialGradient>
          </defs>
          <g transform={`translate(${resonanceWave.source.x} ${resonanceWave.source.y})`}>
            <circle r={resonanceWave.sourcePulseRadius} fill={`url(#resonance-source-bloom-${resonanceWave.id})`} opacity="0">
              <animate attributeName="opacity" values="0;0.9;0" keyTimes="0;0.18;1" dur="720ms" fill="freeze" />
              <animateTransform attributeName="transform" type="scale" values="0.24;1.02;1.2" keyTimes="0;0.32;1" dur="720ms" fill="freeze" />
            </circle>
            <circle
              r={resonanceWave.sourcePulseRadius * 0.82}
              fill="none"
              stroke={withAlpha(resonanceWave.sourceColor, 0.32)}
              strokeWidth="1.4"
              opacity="0"
            >
              <animate attributeName="opacity" values="0;0.4;0" keyTimes="0;0.16;1" dur="720ms" fill="freeze" />
              <animateTransform attributeName="transform" type="scale" values="0.2;1;1.18" keyTimes="0;0.3;1" dur="720ms" fill="freeze" />
            </circle>
          </g>

          <g transform={`translate(${resonanceWave.source.x} ${resonanceWave.source.y}) rotate(${resonanceWave.angleDeg})`}>
            <g>
              <path
                d={buildElectroLinePath(resonanceWave.lineStart, resonanceWave.lineLength, resonanceWave.lineAmplitude)}
                fill="none"
                stroke={`url(#resonance-line-${resonanceWave.id})`}
                strokeWidth="1.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                opacity="0"
                style={{ filter: `drop-shadow(0 0 6px ${withAlpha(resonanceWave.targetColor, 0.18)})` }}
              >
                <animate attributeName="opacity" values="0;1;0.94;0" keyTimes="0;0.12;0.72;1" dur={`${resonanceWave.lineDuration}ms`} fill="freeze" />
                <animate attributeName="stroke-dasharray" values="0 1;1 0;1 0;0 1" keyTimes="0;0.42;0.72;1" dur={`${resonanceWave.lineDuration}ms`} fill="freeze" />
              </path>
              <path
                d={buildElectroLinePath(resonanceWave.lineStart, resonanceWave.lineLength, resonanceWave.lineAmplitude * 0.42)}
                fill="none"
                stroke={withAlpha(resonanceWave.targetColor, 0.3)}
                strokeWidth="0.52"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                opacity="0"
              >
                <animate attributeName="opacity" values="0;0.9;0" keyTimes="0;0.18;1" dur={`${resonanceWave.lineDuration - 40}ms`} fill="freeze" />
                <animate attributeName="stroke-dasharray" values="0 1;0.72 0.28;0 1" keyTimes="0;0.54;1" dur={`${resonanceWave.lineDuration - 40}ms`} fill="freeze" />
              </path>
              <g opacity="0">
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.8;1" dur={`${resonanceWave.lineDuration}ms`} fill="freeze" />
                <animateMotion
                  path={buildElectroLinePath(resonanceWave.lineStart, resonanceWave.lineLength, resonanceWave.lineAmplitude)}
                  dur={`${resonanceWave.lineDuration - 60}ms`}
                  fill="freeze"
                />
                <circle r="9" fill={withAlpha(resonanceWave.targetColor, 0.22)} style={{ filter: `blur(4px) drop-shadow(0 0 8px ${withAlpha(resonanceWave.targetColor, 0.26)})` }} />
                <circle r="2.6" fill={withAlpha(resonanceWave.targetColor, 0.98)} />
              </g>
            </g>

            <g>
              {[-1, -0.5, 0, 0.5, 1].map((offsetRatio, index) => {
                const path = buildFanFlowPath(resonanceWave.distance, resonanceWave.fanSpread, offsetRatio);
                const isEdge = Math.abs(offsetRatio) === 1;
                const begin = resonanceWave.fanDelay + index * 70;
                const duration = resonanceWave.fanDuration - (isEdge ? 0 : 80) + index * 28;
                const particleBegin = begin + 80;
                const particleDuration = Math.max(860, duration - 180);

                return (
                  <g key={offsetRatio}>
                    <path
                      d={path}
                      fill="none"
                      stroke={isEdge ? `url(#resonance-flow-${resonanceWave.id})` : withAlpha(resonanceWave.targetColor, 0.56)}
                      strokeWidth={isEdge ? 1.4 : index === 2 ? 1.2 : 0.95}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength="1"
                      opacity="0"
                      style={{ filter: `drop-shadow(0 0 ${isEdge ? 12 : 8}px ${withAlpha(resonanceWave.targetColor, isEdge ? 0.32 : 0.22)})` }}
                    >
                      <animate attributeName="opacity" values={isEdge ? '0;0.9;0.72;0' : '0;0.76;0.58;0'} keyTimes="0;0.16;0.74;1" begin={`${begin}ms`} dur={`${duration}ms`} fill="freeze" />
                      <animate attributeName="stroke-dasharray" values="0 1;0.42 0.58;0.3 0.7;0 1" keyTimes="0;0.22;0.76;1" begin={`${begin}ms`} dur={`${duration}ms`} fill="freeze" />
                      <animate attributeName="stroke-dashoffset" values="0.12;0.04;-0.08" keyTimes="0;0.48;1" begin={`${begin}ms`} dur={`${duration}ms`} fill="freeze" />
                    </path>
                    <g opacity="0">
                      <animate attributeName="opacity" values="0;1;0.96;0" keyTimes="0;0.16;0.8;1" begin={`${particleBegin}ms`} dur={`${particleDuration}ms`} fill="freeze" />
                      <animateMotion path={path} begin={`${particleBegin}ms`} dur={`${particleDuration}ms`} rotate="auto" fill="freeze" />
                      <circle r={isEdge ? 8.8 : offsetRatio === 0 ? 8 : 6.8} fill={`url(#resonance-particle-${resonanceWave.id})`} />
                      <circle r={isEdge ? 3.1 : 2.8} fill={withAlpha(resonanceWave.targetColor, 0.98)} style={{ filter: `drop-shadow(0 0 12px ${withAlpha(resonanceWave.targetColor, 0.42)})` }} />
                    </g>
                  </g>
                );
              })}
            </g>
          </g>

          {renderResonanceBurst({
            center: resonanceWave.source,
            color: resonanceWave.sourceColor,
            gradientId: `resonance-source-bloom-${resonanceWave.id}`,
            delay: resonanceWave.resonanceDelay,
            bloomRadius: Math.max(26, resonanceWave.sourcePulseRadius * 0.62),
            ringBaseRadius: Math.max(18, resonanceWave.sourcePulseRadius * 0.38),
            intensity: 0.56,
            bloomDuration: 1480,
            ringDuration: 1440,
            ringLag: 180,
          })}
          {renderResonanceBurst({
            center: resonanceWave.target,
            color: resonanceWave.targetColor,
            gradientId: `resonance-target-bloom-${resonanceWave.id}`,
            delay: resonanceWave.resonanceDelay + 100,
            bloomRadius: Math.max(28, resonanceWave.sourcePulseRadius * 0.72),
            ringBaseRadius: Math.max(20, resonanceWave.sourcePulseRadius * 0.42),
            intensity: 0.68,
            bloomDuration: 1560,
            ringDuration: 1520,
            ringLag: 190,
          })}
        </svg>
      ) : null}

      <StarDetailTooltip star={hoveredStar} position={tooltipPosition} />
      <ResonanceAction star={activeStar} position={actionPosition} onResonate={handleResonate} />
    </div>
  );
}
