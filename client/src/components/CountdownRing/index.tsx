import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

interface CountdownRingProps {
  total: number;
  remaining: number;
  size?: number;
  strokeWidth?: number;
  accentColor?: string;
}

const CountdownRing: React.FC<CountdownRingProps> = ({
  total,
  remaining,
  size = 80,
  strokeWidth = 5,
  accentColor = '#a259ff',
}) => {
  const canvasRef = useRef<any>();
  const animRef = useRef<number>();

  // 用 Canvas 2D 真正画 SVG 风格的圆环
  useEffect(() => {
    const query = Taro.createSelectorQuery();
    query.select('#countdown-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res?.[0]?.node;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = Taro.getDeviceInfo().pixelRatio || 2;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const cx = size / 2;
        const cy = size / 2;
        const r = (size - strokeWidth) / 2;
        const startAngle = -Math.PI / 2;
        const progress = total > 0 ? remaining / total : 0;
        const endAngle = startAngle + Math.PI * 2 * progress;
        // 颜色渐变：绿色(#10b981) → 红色(#f97060)
        const t = 1 - progress; // 0=满时间, 1=耗尽
        const red = Math.round(16 + 233 * t);
        const green = Math.round(185 - 73 * t);
        const blue = Math.round(129 - 33 * t);
        const progressColor = `rgb(${red}, ${green}, ${blue})`;

        // 清除
        ctx.clearRect(0, 0, size, size);

        // 背景圆（白色填充 + 浅灰描边）
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = strokeWidth;
        ctx.stroke();

        // 进度弧线
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.strokeStyle = progressColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 数字
        ctx.fillStyle = progressColor;
        ctx.font = `800 ${size * 0.45}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(Math.ceil(remaining)), cx, cy);
      });

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [total, remaining, size, accentColor]);

  return (
    <Canvas
      id='countdown-canvas'
      ref={canvasRef}
      type='2d'
      className='countdown-ring'
      style={{ width: size, height: size }}
    />
  );
};

export default CountdownRing;
