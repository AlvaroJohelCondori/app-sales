import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';

describe('Application routes', () => {
  it('redirects an undefined route to the home page', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: appConfig.providers
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/posts');
    await fixture.whenStable();
    expect(router.url).toBe('/');
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Una nueva base');
  });
});
