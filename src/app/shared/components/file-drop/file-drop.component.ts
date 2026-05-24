import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-file-drop',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-drop.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileDropComponent {
  @Input() label = 'Archivo';
  @Input() hint = 'Arrastre el archivo o seleccione uno desde su equipo.';
  @Input() accept = '*/*';
  @Input() maxBytes = 50 * 1024 * 1024;

  @Output() readonly fileChosen = new EventEmitter<File>();
  @Output() readonly fileCleared = new EventEmitter<void>();

  readonly chosen = signal<File | null>(null);
  readonly error = signal<string | null>(null);
  readonly dragging = signal(false);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  openPicker(): void {
    this.error.set(null);
    this.fileInput.nativeElement.click();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) this.acceptFile(f);
    input.value = '';
  }

  clear(): void {
    this.chosen.set(null);
    this.error.set(null);
    this.fileCleared.emit();
  }

  @HostListener('dragover', ['$event'])
  onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.dragging.set(true);
  }

  @HostListener('dragleave')
  onDragLeave(): void {
    this.dragging.set(false);
  }

  @HostListener('drop', ['$event'])
  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.dragging.set(false);
    const f = ev.dataTransfer?.files?.[0];
    if (f) this.acceptFile(f);
  }

  formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  private acceptFile(file: File): void {
    if (file.size > this.maxBytes) {
      this.error.set(`El archivo supera el límite (${this.formatBytes(this.maxBytes)}).`);
      return;
    }
    this.error.set(null);
    this.chosen.set(file);
    this.fileChosen.emit(file);
  }
}
