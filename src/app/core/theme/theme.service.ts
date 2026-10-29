import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'app-sales-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly currentTheme = signal<Theme>('light');
  readonly isDark = computed(() => this.currentTheme() === 'dark');

  initialize(): void {
    const window = this.document.defaultView;
    let stored: string | null = null;
    try {
      stored = window?.localStorage.getItem(STORAGE_KEY) ?? null;
    } catch {
      // El navegador puede bloquear el almacenamiento; el cambio de tema sigue disponible.
    }
    const theme =
      stored === 'light' || stored === 'dark'
        ? stored
        : window?.matchMedia?.('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    this.apply(theme);
  }

  toggle(): void {
    const theme = this.isDark() ? 'light' : 'dark';
    this.apply(theme);
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Sin almacenamiento, la preferencia se conserva durante esta sesión de la app.
    }
  }

  private apply(theme: Theme): void {
    this.currentTheme.set(theme);
    this.document.documentElement.classList.toggle('app-dark', theme === 'dark');
    this.document.documentElement.style.colorScheme = theme;
  }
}
