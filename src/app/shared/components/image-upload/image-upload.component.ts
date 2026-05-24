import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  ElementRef,
  signal,
} from '@angular/core';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageUploadComponent {
  @Input() label = 'Imagen';
  @Input() hint = 'JPG, PNG o WEBP. Máximo 5 MB.';
  @Input() existingUrl: string | null = null;

  @Output() readonly fileChosen = new EventEmitter<File>();
  @Output() readonly fileCleared = new EventEmitter<void>();

  readonly preview = signal<string | null>(null);
  readonly chosen = signal<{ name: string; sizeKb: number; type: string } | null>(null);
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
    // reset so re-picking the same file fires change
    input.value = '';
  }

  clear(): void {
    this.preview.set(null);
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

  private acceptFile(file: File): void {
    if (!ACCEPTED.includes(file.type)) {
      this.error.set(`Tipo no permitido (${file.type}). Use JPG, PNG o WEBP.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      this.error.set('La imagen supera el límite de 5 MB.');
      return;
    }
    this.error.set(null);
    this.chosen.set({ name: file.name, sizeKb: Math.round(file.size / 1024), type: file.type });
    const reader = new FileReader();
    reader.onload = () => this.preview.set(reader.result as string);
    reader.readAsDataURL(file);
    this.fileChosen.emit(file);
  }
}
