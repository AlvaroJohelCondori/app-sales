import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { BROWSER_TIME_ZONE, TimeZoneService } from './time-zone.service';

const utcDate = '2026-10-29T00:58:07.000Z';

describe('TimeZoneService', () => {
  function setup(browser = 'America/La_Paz', saved: string | null = null, blocked = false) {
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
        { provide: BROWSER_TIME_ZONE, useValue: browser },
        { provide: DOCUMENT, useValue: { defaultView: { localStorage: storage } } },
      ],
    });
    const service = TestBed.inject(TimeZoneService);
    service.initialize();
    return { service, storage };
  }

  it('uses the browser zone automatically, including zones outside the manual options', () => {
    const { service } = setup('Europe/Madrid');
    expect(service.preference()).toBe('auto');
    expect(service.timeZone()).toBe('Europe/Madrid');
    expect(service.label()).toBe('Europe/Madrid');
  });

  it('converts the same UTC instant to Bolivia, Peru and Argentina without changing its value', () => {
    const { service } = setup();
    expect(service.format(utcDate)).toContain('28');
    expect(service.format(utcDate)).toContain('20:58');
    service.select('America/Lima');
    expect(service.format(utcDate)).toContain('19:58');
    expect(service.label()).toBe('Perú');
    service.select('America/Argentina/Buenos_Aires');
    expect(service.format(utcDate)).toContain('21:58');
    expect(service.label()).toBe('Argentina');
    expect(utcDate).toBe('2026-10-29T00:58:07.000Z');
  });

  it('restores a saved choice instead of the browser zone and allows returning to automatic', () => {
    const { service, storage } = setup('America/Lima', 'America/Argentina/Buenos_Aires');
    expect(service.timeZone()).toBe('America/Argentina/Buenos_Aires');
    service.select('auto');
    expect(service.timeZone()).toBe('America/Lima');
    expect(service.format(utcDate)).toContain('19:58');
    expect(storage.setItem).toHaveBeenLastCalledWith('app-sales-time-zone', 'auto');
  });

  it('falls back to Bolivia for an invalid detection and ignores invalid saved or selected values', () => {
    const { service } = setup('Invalid/Zone', 'invalid');
    expect(service.preference()).toBe('auto');
    expect(service.timeZone()).toBe('America/La_Paz');
    service.select('not-supported');
    expect(service.timeZone()).toBe('America/La_Paz');
  });

  it('keeps selection usable when storage is unavailable and handles absent dates', () => {
    const { service } = setup('America/La_Paz', null, true);
    expect(() => service.select('America/Lima')).not.toThrow();
    expect(service.timeZone()).toBe('America/Lima');
    expect(service.format(null)).toBe('Sin fecha');
    expect(service.format('invalid')).toBe('Sin fecha');
  });
});
