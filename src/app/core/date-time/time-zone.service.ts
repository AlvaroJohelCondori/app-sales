import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';

export type TimeZonePreference =
  'auto' | 'America/La_Paz' | 'America/Lima' | 'America/Argentina/Buenos_Aires';
const FALLBACK_ZONE = 'America/La_Paz';
const STORAGE_KEY = 'app-sales-time-zone';

export const BROWSER_TIME_ZONE = new InjectionToken<string>('BROWSER_TIME_ZONE', {
  providedIn: 'root',
  factory: () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_ZONE;
    } catch {
      return FALLBACK_ZONE;
    }
  },
});

@Injectable({ providedIn: 'root' })
export class TimeZoneService {
  private readonly document = inject(DOCUMENT);
  private readonly browserZone = inject(BROWSER_TIME_ZONE);
  private readonly preferenceState = signal<TimeZonePreference>('auto');
  private readonly detectedZone = signal(FALLBACK_ZONE);
  readonly preference = this.preferenceState.asReadonly();
  readonly timeZone = computed(() =>
    this.preference() === 'auto' ? this.detectedZone() : this.preference(),
  );
  readonly label = computed(() => this.zoneLabel(this.timeZone()));
  readonly options = [
    { label: 'Automática', value: 'auto', description: 'Usar la zona del dispositivo' },
    { label: 'Bolivia', value: 'America/La_Paz', description: 'America/La_Paz' },
    { label: 'Perú', value: 'America/Lima', description: 'America/Lima' },
    {
      label: 'Argentina',
      value: 'America/Argentina/Buenos_Aires',
      description: 'America/Argentina/Buenos_Aires',
    },
  ];
  private readonly formatter = computed(
    () =>
      new Intl.DateTimeFormat('es-BO', {
        timeZone: this.timeZone(),
        dateStyle: 'medium',
        timeStyle: 'short',
        hourCycle: 'h23',
      }),
  );

  initialize(): void {
    try {
      new Intl.DateTimeFormat('es-BO', { timeZone: this.browserZone }).format();
      this.detectedZone.set(this.browserZone);
    } catch {
      this.detectedZone.set(FALLBACK_ZONE);
    }
    let stored: string | null = null;
    try {
      stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY) ?? null;
    } catch {
      /* La selección sigue funcionando cuando el navegador bloquea el almacenamiento. */
    }
    this.preferenceState.set(this.isPreference(stored) ? stored : 'auto');
  }

  select(value: unknown): void {
    if (!this.isPreference(value)) return;
    this.preferenceState.set(value);
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* Sin almacenamiento, la preferencia dura mientras la aplicación siga abierta. */
    }
  }

  format(value: string | null): string {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Sin fecha' : this.formatter().format(date);
  }

  private isPreference(value: unknown): value is TimeZonePreference {
    return this.options.some((option) => option.value === value);
  }

  private zoneLabel(zone: string): string {
    if (zone === 'America/Buenos_Aires') return 'Argentina';
    return this.options.find((option) => option.value === zone)?.label ?? zone.replaceAll('_', ' ');
  }
}
