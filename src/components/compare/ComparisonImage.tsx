import { useState } from 'react';
import { Loader } from '@cloudflare/kumo/components/loader';
import { Button } from '@cloudflare/kumo/components/button';
export function ComparisonImage({
  src,
  alt,
  className = 'h-full w-full object-contain',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState('');
  const [failed, setFailed] = useState('');
  const [attempt, setAttempt] = useState(0);
  const key = `${src}:${attempt}`;
  return (
    <div className="relative h-full min-h-48 w-full">
      {loaded !== key && failed !== key && (
        <div role="status" className="absolute inset-0 grid place-items-center text-white">
          <Loader aria-label="Loading comparison image" />
        </div>
      )}
      {failed === key && (
        <div
          role="status"
          className="absolute inset-0 flex flex-col items-center justify-center bg-background p-4 text-foreground"
        >
          Image unavailable
          <Button
            onClick={() => {
              setAttempt(attempt + 1);
            }}
          >
            Retry image
          </Button>
        </div>
      )}
      <img
        key={key}
        src={src}
        alt={alt}
        className={`${className} ${loaded === key ? '' : 'opacity-0'}`}
        onLoad={() => setLoaded(key)}
        onError={() => setFailed(key)}
        draggable={false}
      />
    </div>
  );
}
