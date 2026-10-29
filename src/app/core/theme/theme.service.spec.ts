import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  function setup(saved: string | null, systemDark = false, blocked = false) {
    const root = document.createElement('html');
    const storage = {
      getItem: vi.fn(() => {
        if (blocked) throw new Error('Storage blocked');
        return saved;
      }),
      setItem: vi.fn(() => {
        if (blocked) throw new Error('Storage blocked');
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: {
            documentElement: root,
            defaultView: { localStorage: storage, matchMedia: () => ({ matches: systemDark }) },
          },
        },
      ],
    });
    const service = TestBed.inject(ThemeService);
    service.initialize();
    return { service, root, storage };
  }

  it('uses the system preference when no preference has been saved', () => {
    const { service, root } = setup(null, true);
    expect(service.isDark()).toBe(true);
    expect(root.classList.contains('app-dark')).toBe(true);
  });

  it('restores an explicit light preference even when the system is dark', () => {
    const { service, root } = setup('light', true);
    expect(service.isDark()).toBe(false);
    expect(root.classList.contains('app-dark')).toBe(false);
    expect(root.style.colorScheme).toBe('light');
  });

  it('switches in both directions and saves the preference', () => {
    const { service, root, storage } = setup('light');
    service.toggle();
    expect(root.classList.contains('app-dark')).toBe(true);
    expect(storage.setItem).toHaveBeenLastCalledWith('app-sales-theme', 'dark');
    service.toggle();
    expect(root.classList.contains('app-dark')).toBe(false);
    expect(storage.setItem).toHaveBeenLastCalledWith('app-sales-theme', 'light');
  });

  it('continues working when browser storage is blocked', () => {
    const { service, root } = setup(null, false, true);
    expect(() => service.toggle()).not.toThrow();
    expect(root.classList.contains('app-dark')).toBe(true);
  });
});
