import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Centered spinner + optional label. Mirrors the customer app's AppLoadingState. */
@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-12">
      <span class="h-8 w-8 animate-spin rounded-full border-2 border-boutique-accent border-t-transparent" aria-hidden="true"></span>
      <p *ngIf="label" class="text-sm text-boutique-mute">{{ label }}</p>
    </div>
  `,
})
export class LoadingStateComponent {
  @Input() label?: string;
}
