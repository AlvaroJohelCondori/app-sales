import { TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { appConfig } from '../../app.config';

describe('HomeComponent', () => {
  it('renders the three libraries and verifies their integration on click', async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: appConfig.providers
    }).compileComponents();
    const fixture = TestBed.createComponent(HomeComponent);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('p-card')).toHaveLength(3);
    expect(page.querySelector('fa-icon svg')).not.toBeNull();
    expect(page.querySelector('[role="status"]')).toBeNull();
    const button = page.querySelector('p-button button') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    expect(page.querySelector('[role="status"]')?.textContent).toContain('¡Todo listo!');
    expect(button.disabled).toBe(true);
  });
});
