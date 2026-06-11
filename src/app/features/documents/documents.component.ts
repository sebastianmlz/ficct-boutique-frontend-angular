import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentRecord } from '../../shared/models';
import { DocumentsService, LedgerEntry } from './documents.service';
import { AuthService } from '../../core/auth/auth.service';
import { FileDropComponent } from '../../shared/components/file-drop/file-drop.component';
import { AutosizeTextareaDirective } from '../../shared/directives/autosize-textarea.directive';
import { ShortIdPipe } from '../../shared/pipes/short-id.pipe';

const MIME_BY_CATEGORY: Record<DocumentRecord['category'], string[]> = {
  word: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  excel: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  pdf: ['application/pdf'],
  image: ['image/jpeg', 'image/png', 'image/webp'],
  other: ['application/octet-stream'],
};

const ACCEPT_BY_CATEGORY: Record<DocumentRecord['category'], string> = {
  word: '.docx',
  excel: '.xlsx',
  pdf: 'application/pdf,.pdf',
  image: 'image/jpeg,image/png,image/webp',
  other: '*/*',
};

/**
 * Documents management screen. Handles secure upload (request URL, upload,
 * SHA-256, confirm), download, integrity verification and the per-document
 * hash-chain ledger viewer, plus soft delete.
 */
@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, FileDropComponent, AutosizeTextareaDirective, ShortIdPipe],
  templateUrl: './documents.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsComponent {
  private readonly service = inject(DocumentsService);
  readonly auth = inject(AuthService);

  readonly documents = signal<DocumentRecord[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  title = '';
  description = '';
  category: DocumentRecord['category'] = 'pdf';
  selectedFile: File | null = null;
  uploading = false;
  uploadMsg = '';

  verifyingId: string | null = null;
  verifyResult: { intact: boolean; chainIntact: boolean; storedSha: string; currentSha: string } | null = null;

  // Hash-ledger (private blockchain) viewer state.
  readonly ledgerEntries = signal<LedgerEntry[] | null>(null);
  ledgerDoc: DocumentRecord | null = null;
  loadingLedger = false;

  acceptFor(cat: DocumentRecord['category']): string {
    return ACCEPT_BY_CATEGORY[cat];
  }

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.documents.set(await this.service.list());
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'Error');
    } finally {
      this.loading.set(false);
    }
  }

  onFileChosen(file: File): void {
    this.selectedFile = file;
    this.uploadMsg = '';
  }

  onFileCleared(): void {
    this.selectedFile = null;
  }

  async upload(): Promise<void> {
    if (!this.selectedFile || !this.title) {
      this.uploadMsg = 'Seleccione un archivo y un título.';
      return;
    }
    const mimeAllowed = MIME_BY_CATEGORY[this.category];
    if (!mimeAllowed.includes(this.selectedFile.type)) {
      this.uploadMsg = `Tipo no permitido para categoría ${this.category}: ${this.selectedFile.type}`;
      return;
    }
    this.uploading = true;
    this.uploadMsg = 'Solicitando URL…';
    try {
      const req = await this.service.requestUpload({
        title: this.title,
        description: this.description || undefined,
        category: this.category,
        mimeType: this.selectedFile.type,
        sizeBytes: this.selectedFile.size,
      });
      this.uploadMsg = 'Subiendo a almacenamiento privado…';
      await this.service.uploadBytes(req.upload.url, req.upload.headers, this.selectedFile);
      this.uploadMsg = 'Calculando hash SHA-256…';
      const sha = await this.service.computeSha256(this.selectedFile);
      this.uploadMsg = 'Confirmando subida…';
      await this.service.confirmUpload(req.document.id, sha);
      this.uploadMsg = 'Subida completada.';
      this.title = '';
      this.description = '';
      this.selectedFile = null;
      await this.load();
    } catch (e) {
      this.uploadMsg = (e as { message?: string }).message ?? 'Error al subir';
    } finally {
      this.uploading = false;
    }
  }

  async download(d: DocumentRecord): Promise<void> {
    try {
      const r = await this.service.downloadUrl(d.id);
      window.open(r.url, '_blank');
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'Error');
    }
  }

  async verify(d: DocumentRecord): Promise<void> {
    this.verifyingId = d.id;
    this.verifyResult = null;
    try {
      const r = await this.service.verify(d.id);
      this.verifyResult = {
        intact: r.intact,
        chainIntact: r.chainIntact,
        storedSha: r.storedSha,
        currentSha: r.currentSha,
      };
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'Error en verificación');
    }
  }

  closeVerify(): void {
    this.verifyingId = null;
    this.verifyResult = null;
  }

  // Opens the per-document hash-chain ledger and runs an integrity check so the
  // admin can see the SHA-256 chain (chain_hash / prev_chain_hash) plus the
  // intact / chainIntact verdict in one place.
  async viewLedger(d: DocumentRecord): Promise<void> {
    this.ledgerDoc = d;
    this.ledgerEntries.set(null);
    this.verifyResult = null;
    this.loadingLedger = true;
    const [entries, verify] = await Promise.allSettled([this.service.ledger(d.id), this.service.verify(d.id)]);
    if (entries.status === 'fulfilled') {
      this.ledgerEntries.set(entries.value);
    } else {
      this.error.set((entries.reason as { message?: string })?.message ?? 'Error al cargar la cadena');
    }
    if (verify.status === 'fulfilled') {
      this.verifyResult = {
        intact: verify.value.intact,
        chainIntact: verify.value.chainIntact,
        storedSha: verify.value.storedSha,
        currentSha: verify.value.currentSha,
      };
    }
    this.loadingLedger = false;
  }

  closeLedger(): void {
    this.ledgerDoc = null;
    this.ledgerEntries.set(null);
    this.verifyResult = null;
  }

  async remove(d: DocumentRecord): Promise<void> {
    if (!confirm(`¿Eliminar documento "${d.title}"?`)) return;
    try {
      await this.service.softDelete(d.id);
      await this.load();
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'Error al eliminar');
    }
  }

  formatBytes(n: string): string {
    const v = Number(n);
    if (!Number.isFinite(v)) return n;
    if (v < 1024) return `${v} B`;
    if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
    return `${(v / (1024 * 1024)).toFixed(1)} MB`;
  }

  categoryLabel(c: DocumentRecord['category']): string {
    switch (c) {
      case 'word': return 'Contrato (Word)';
      case 'excel': return 'Reporte (Excel)';
      case 'pdf': return 'Factura (PDF)';
      case 'image': return 'Imagen';
      case 'other': return 'Otro';
    }
  }
}
