import React, { useEffect } from 'react';
import { assetUrl } from '../../utils/assetUrl';

/**
 * Original Unity Splash Screen (4 seconds max):
 * Black background with the Costa Rica Pura Vida logo smoothly scaling up,
 * then transitioning automatically to the Main Menu.
 */
export default function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish?.();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden"
      style={{ backgroundColor: '#000000' }}
    >
      <img
        src={assetUrl('textures/Logo Costa Rica Loading B.png')}
        alt="Costa Rica Pura Vida in Many Ways"
        className="w-72 sm:w-96 md:w-[440px] max-w-[82vw] max-h-[75vh] object-contain splash-logo-zoom"
        draggable={false}
      />
    </div>
  );
}
