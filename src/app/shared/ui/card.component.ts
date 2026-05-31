import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Shared surface card. Matches the customer app's AppCard. */
@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" [class.!p-0]="!padded">
      <div *ngIf="title || subtitle" class="mb-4">
        <h3 *ngIf="title" class="text-lg">{{ title }}</h3>
        <p *ngIf="subtitle" class="text-sm text-boutique-mute">{{ subtitle }}</p>
      </div>
      <ng-content></ng-content>
    </div>
  `,
})
export class CardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() padded = true;
}
