import { Component, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck, faCode, faLayerGroup, faPalette, faRocket } from '@fortawesome/free-solid-svg-icons';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-home',
  imports: [ButtonModule, CardModule, MessageModule, TagModule, FontAwesomeModule],
  templateUrl: './home.component.html'
})
export class HomeComponent {
  readonly verified = signal(false);
  readonly icons = { check: faCheck, code: faCode, layers: faLayerGroup, palette: faPalette, rocket: faRocket };
}
