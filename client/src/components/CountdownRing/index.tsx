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
        const progress = remaining / total;
        const endAngle = startAngle + Math.PI * 2 * progress;
        const isUrgent = remaining <= 3;

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
        ctx.strokeStyle = isUrgent ? '#f97060' : accentColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 数字（带缩放动画）
        ctx.fillStyle = isUrgent ? '#f97060' : '#1e1b4b';
        ctx.font = `extrabold ${size * 0.28}px sans-serif`;
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
