import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent, IconName } from './icon.component';

/**
 * Shared button. Variants encode the admin button hierarchy
 * (primary / secondary / danger / ghost) and stay in sync with the customer
 * app's AppButton. Optional leading icon + loading state.
 */
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [ngClass]="classes"
      (click)="pressed.emit($event)"
    >
      <app-icon *ngIf="icon && !loading" [name]="icon" [size]="size === 'sm' ? 16 : 18" />
      <span *ngIf="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true"></span>
      <ng-content></ng-content>
    </button>
  `,
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary';
  @Input() size: 'md' | 'sm' = 'md';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() icon?: IconName;
  @Input() disabled = false;
  @Input() loading = false;
  @Input() block = false;
  @Output() pressed = new EventEmitter<MouseEvent>();

  get classes(): Record<string, boolean> {
    return {
      'btn-primary': this.variant === 'primary',
      'btn-secondary': this.variant === 'secondary',
      'btn-danger': this.variant === 'danger',
      'btn-ghost': this.variant === 'ghost',
      'w-full': this.block,
      'px-3 py-1.5 text-xs': this.size === 'sm',
    };
  }
}
