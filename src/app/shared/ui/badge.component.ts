import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Status pill. Tones match the customer app's AppBadge + the admin badge classes. */
@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [ngClass]="cls">
      <span *ngIf="dot" class="h-1.5 w-1.5 rounded-full" [ngClass]="dotCls"></span>
      <ng-content></ng-content>
    </span>
  `,
})
export class BadgeComponent {
  @Input() tone: 'active' | 'pending' | 'deleted' | 'neutral' | 'accent' = 'neutral';
  @Input() dot = false;

  get cls(): string {
    const base = 'badge gap-1.5';
    switch (this.tone) {
      case 'active':
        return `${base} badge-active`;
      case 'pending':
        return `${base} badge-pending`;
      case 'deleted':
        return `${base} badge-deleted`;
      case 'accent':
        return `${base} bg-boutique-accentSoft text-boutique-accent`;
      default:
        return `${base} bg-stone-100 text-stone-600`;
    }
  }

  get dotCls(): string {
    switch (this.tone) {
      case 'active':
        return 'bg-emerald-600';
      case 'pending':
        return 'bg-amber-600';
      case 'accent':
        return 'bg-boutique-accent';
      default:
        return 'bg-stone-500';
    }
  }
}
