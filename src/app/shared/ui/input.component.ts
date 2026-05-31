import { Component, Input, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

/** Shared labelled text input (ControlValueAccessor). Uses the .label/.input tokens. */
@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => InputComponent), multi: true }],
  template: `
    <div class="flex flex-col gap-1">
      <label *ngIf="label" class="label !mb-0" [attr.for]="id">{{ label }}</label>
      <input
        [id]="id"
        [type]="type"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [value]="value"
        (input)="onInput($event)"
        (blur)="onTouched()"
        class="input"
      />
      <p *ngIf="hint" class="text-xs text-boutique-mute">{{ hint }}</p>
    </div>
  `,
})
export class InputComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() hint?: string;
  @Input() id = `app-input-${nextId++}`;

  value = '';
  disabled = false;
  onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  onInput(e: Event): void {
    this.value = (e.target as HTMLInputElement).value;
    this.onChange(this.value);
  }
  writeValue(v: string): void {
    this.value = v ?? '';
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
