import { useEffect, useState } from 'react';

export function NavigationProgress() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const start = () => setActive(true);
    const end = () => setActive(false);

    document.addEventListener('astro:before-preparation', start);
    document.addEventListener('astro:page-load', end);
    document.addEventListener('astro:after-swap', end);

    return () => {
      document.removeEventListener('astro:before-preparation', start);
      document.removeEventListener('astro:page-load', end);
      document.removeEventListener('astro:after-swap', end);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-hidden="true"
      className="pointer-events-none fixed top-0 right-0 left-0 z-1100 h-0.5 overflow-hidden bg-orange-950/40"
    >
      <div className="nav-progress-bar h-full w-1/3 bg-gradient-to-r from-orange-500 via-red-500 to-orange-600" />
    </div>
  );
}
