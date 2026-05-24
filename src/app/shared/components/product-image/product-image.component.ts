import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { DocumentDisplayService } from '../../services/document-display.service';

@Component({
  selector: 'app-product-image',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-image.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductImageComponent implements OnChanges {
  @Input() imageDocumentId: string | null = null;
  @Input() imageUrl: string | null = null;
  @Input() alt = 'Producto';
  @Input() sizeClass = 'h-12 w-12';
  @Input() rounded = 'rounded-md';

  private readonly service = inject(DocumentDisplayService);
  readonly resolvedUrl = signal<string | null>(null);
  readonly failed = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if ('imageDocumentId' in changes || 'imageUrl' in changes) {
      this.failed.set(false);
      if (this.imageDocumentId) {
        this.resolvedUrl.set(null);
        void this.resolve();
      } else {
        this.resolvedUrl.set(this.imageUrl);
      }
    }
  }

  private async resolve(): Promise<void> {
    if (!this.imageDocumentId) return;
    const url = await this.service.getDisplayUrl(this.imageDocumentId);
    if (!url) this.failed.set(true);
    this.resolvedUrl.set(url);
  }

  onImgError(): void {
    this.failed.set(true);
  }
}
