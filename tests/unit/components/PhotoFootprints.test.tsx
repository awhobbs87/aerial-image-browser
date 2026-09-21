import { act, render } from '@testing-library/react';
import { PhotoFootprints } from '@/components/map/PhotoFootprints';
import { useUIStore } from '@/stores/uiStore';
import type { EnhancedPhoto } from '@/types/photo';

function mockMap() {
  let source: { setData: ReturnType<typeof vi.fn> } | undefined;
  const handlers = new Map<string, Set<Function>>();
  const on = vi.fn<(name: string, ...args: any[]) => void>((name, ...args) => {
    const key = args.length === 2 ? `${name}:${args[0]}` : name;
    if (!handlers.has(key)) handlers.set(key, new Set());
    handlers.get(key)!.add(args.at(-1));
  });
  const off = vi.fn<(name: string, ...args: any[]) => void>((name, ...args) =>
    handlers.get(args.length === 2 ? `${name}:${args[0]}` : name)?.delete(args.at(-1)),
  );
  return {
    getSource: vi.fn<() => typeof source>(() => source),
    addSource: vi.fn<() => void>(() => {
      source = { setData: vi.fn<(...args: any[]) => void>() };
    }),
    addLayer: vi.fn<(...args: any[]) => void>(),
    isStyleLoaded: () => true,
    setFeatureState: vi.fn<(...args: any[]) => void>(),
    on,
    off,
    once: on,
    getCanvas: () => ({ style: {} }),
    handlers,
    clearSource: () => {
      source = undefined;
    },
  };
}
const photos = [
  {
    objectId: 1,
    layerId: 0,
    rings: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  },
] as EnhancedPhoto[];
it('hover and callback changes do not rebuild data; style changes restore footprints', () => {
  const map = mockMap();
  const click = vi.fn<(...args: any[]) => void>();
  const view = render(<PhotoFootprints map={map as any} photos={photos} onPhotoClick={click} />);
  const source = map.getSource()!;
  act(() => useUIStore.getState().setHoveredPhotoId(1, 0));
  view.rerender(
    <PhotoFootprints
      map={map as any}
      photos={photos}
      onPhotoClick={vi.fn<(...args: any[]) => void>()}
    />,
  );
  expect(source.setData).not.toHaveBeenCalled();
  expect(map.setFeatureState).toHaveBeenCalledWith(
    { source: 'photo-footprints', id: '0:1' },
    { hover: true },
  );
  map.clearSource();
  act(() => map.handlers.get('style.load')!.forEach((fn) => fn()));
  expect(map.addSource).toHaveBeenCalledTimes(2);
  view.unmount();
  expect([...map.handlers.values()].every((set) => set.size === 0)).toBe(true);
});
it('click handlers see current results and distinguish object IDs across layers', () => {
  const map = mockMap();
  const click = vi.fn<(...args: any[]) => void>();
  const view = render(<PhotoFootprints map={map as any} photos={photos} onPhotoClick={click} />);
  const next = [{ ...photos[0], layerId: 2 }];
  view.rerender(<PhotoFootprints map={map as any} photos={next} onPhotoClick={click} />);
  act(() =>
    map.handlers
      .get('click:photo-footprints-hover-fill')!
      .forEach((fn) => fn({ features: [{ properties: { photoId: '2:1' } }] })),
  );
  expect(click).toHaveBeenCalledWith(next[0]);
});
