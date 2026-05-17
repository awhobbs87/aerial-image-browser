import { useState, useEffect } from 'react';
import { IconArrowUp } from '@tabler/icons-react';
import { Tooltip } from '@/components/ui/Tooltip';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed right-5 bottom-20 z-100">
      <Tooltip label="Back to top" side="left">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          className={`flex h-11 w-11 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg transition duration-150 hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${
            visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
          }`}
        >
          <IconArrowUp size={20} />
        </button>
      </Tooltip>
    </div>
  );
}
