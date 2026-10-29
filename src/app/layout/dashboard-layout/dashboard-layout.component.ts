import { CartComponent } from '../../features/cart/cart.component';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faChartSimple,
  faBoxesStacked,
  faReceipt,
  faLayerGroup,
  faMoon,
  faSun,
} from '@fortawesome/free-solid-svg-icons';
import { TimeZoneSelectorComponent } from '../../shared/components/time-zone-selector/time-zone-selector.component';
import { ButtonModule } from 'primeng/button';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-dashboard-layout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    FontAwesomeModule,
    TimeZoneSelectorComponent,
    CartComponent,
    ButtonModule,
  ],
  templateUrl: './dashboard-layout.component.html',
})
export class DashboardLayoutComponent {
  readonly theme = inject(ThemeService);
  readonly icons = {
    brand: faLayerGroup,
    overview: faChartSimple,
    products: faBoxesStacked,
    sales: faReceipt,
    moon: faMoon,
    sun: faSun,
  };
}
