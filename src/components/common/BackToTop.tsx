import { useState, useEffect } from 'react';
import { Affix, ActionIcon, Transition, Tooltip } from '@mantine/core';
import { IconArrowUp } from '@tabler/icons-react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Affix position={{ bottom: 80, right: 20 }}>
      <Transition transition="slide-up" mounted={visible}>
        {(styles) => (
          <Tooltip label="Back to top" position="left" withArrow>
            <ActionIcon
              style={styles}
              variant="filled"
              color="emerald"
              size="xl"
              radius="xl"
              onClick={scrollToTop}
              aria-label="Scroll to top"
            >
              <IconArrowUp size={20} />
            </ActionIcon>
          </Tooltip>
        )}
      </Transition>
    </Affix>
  );
}
