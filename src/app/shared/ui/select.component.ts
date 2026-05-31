import { Component, Input, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

export interface SelectOption {
  value: string;
  label: string;
}

/** Shared labelled select (ControlValueAccessor). Uses the .label/.select tokens. */
@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true }],
  template: `
    <div class="flex flex-col gap-1">
      <label *ngIf="label" class="label !mb-0" [attr.for]="id">{{ label }}</label>
      <select [id]="id" [disabled]="disabled" [value]="value" (change)="onSelect($event)" (blur)="onTouched()" class="select">
        <option *ngFor="let o of options" [value]="o.value">{{ o.label }}</option>
      </select>
    </div>
  `,
})
export class SelectComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() options: SelectOption[] = [];
  @Input() id = `app-select-${nextId++}`;

  value = '';
  disabled = false;
  onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  onSelect(e: Event): void {
    this.value = (e.target as HTMLSelectElement).value;
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
