import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';
import { ButtonComponent } from './button.component';

/** Friendly error surface with an icon and optional retry. Mirrors AppErrorState. */
@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span class="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">
        <app-icon name="alert" [size]="26" />
      </span>
      <p class="text-lg font-semibold text-boutique-ink">{{ title }}</p>
      <p class="max-w-sm text-sm text-boutique-mute">{{ message }}</p>
      <app-button *ngIf="retry.observed" variant="secondary" icon="refresh" (pressed)="retry.emit()">
        {{ retryLabel }}
      </app-button>
    </div>
  `,
})
export class ErrorStateComponent {
  @Input() title = 'Algo salió mal';
  @Input() message = 'No pudimos cargar esta sección. Inténtalo de nuevo.';
  @Input() retryLabel = 'Reintentar';
  @Output() retry = new EventEmitter<void>();
}
