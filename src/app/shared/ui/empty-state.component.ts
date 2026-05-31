import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, IconName } from './icon.component';

/** Calm, branded empty state. Mirrors the customer app's AppEmptyState. */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span class="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-boutique-mute">
        <app-icon [name]="icon" [size]="24" />
      </span>
      <p class="text-base font-semibold text-boutique-ink">{{ title }}</p>
      <p *ngIf="subtitle" class="max-w-sm text-sm text-boutique-mute">{{ subtitle }}</p>
      <ng-content></ng-content>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon: IconName = 'inbox';
  @Input() title = 'Sin datos';
  @Input() subtitle?: string;
}
