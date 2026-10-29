import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faGlobe } from '@fortawesome/free-solid-svg-icons';
import { SelectModule } from 'primeng/select';
import { TimeZoneService } from '../../../core/date-time/time-zone.service';

@Component({
  selector: 'app-time-zone-selector',
  imports: [FormsModule, SelectModule, FontAwesomeModule],
  templateUrl: './time-zone-selector.component.html',
})
export class TimeZoneSelectorComponent {
  readonly zone = inject(TimeZoneService);
  readonly globeIcon = faGlobe;
}
