import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SalesUpdatesService {
  private readonly updates = new Subject<void>();
  readonly created$ = this.updates.asObservable();

  notifyCreated(): void {
    this.updates.next();
  }
}
