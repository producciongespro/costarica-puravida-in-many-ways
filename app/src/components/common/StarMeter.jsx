import React from 'react';
import { assetUrl } from '../../utils/assetUrl';

/**
 * Renders the 3-piece star meter (Left = piece 0, Center = piece 1, Right = piece 2)
 * using the original sprites: star_cero.png, star_left.png, star_center.png, star_right.png
 */
export default function StarMeter({ levelStr = '000', size = 'md', showCount = false, className = '' }) {
  const s = String(levelStr || '000').padEnd(3, '0');
  const hasLeft = s[0] !== '0';
  const hasCenter = s[1] !== '0';
  const hasRight = s[2] !== '0';
  const count = (hasLeft ? 1 : 0) + (hasCenter ? 1 : 0) + (hasRight ? 1 : 0);

  const sizeClasses = {
    xs: 'w-9 h-9',
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  }[size] || 'w-16 h-16';

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className={`relative ${sizeClasses} select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]`}>
        <img
          src={assetUrl('sprites/star_cero.png')}
          alt="Star frame"
          className="w-full h-full object-contain"
          draggable={false}
        />
        {hasLeft && (
          <img
            src={assetUrl('sprites/star_left.png')}
            alt="Star piece left"
            className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 scale-100"
            draggable={false}
          />
        )}
        {hasCenter && (
          <img
            src={assetUrl('sprites/star_center.png')}
            alt="Star piece center"
            className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 scale-100"
            draggable={false}
          />
        )}
        {hasRight && (
          <img
            src={assetUrl('sprites/star_right.png')}
            alt="Star piece right"
            className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 scale-100"
            draggable={false}
          />
        )}
      </div>
      {showCount && (
        <span className="mt-0.5 text-xs font-bold text-amber-300 tracking-wide drop-shadow">
          {count}/3
        </span>
      )}
    </div>
  );
}
