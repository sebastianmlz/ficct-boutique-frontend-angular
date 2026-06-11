import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditEntry, DocumentRecord } from '../../shared/models';
import { DocumentsService } from '../documents/documents.service';
import { ShortIdPipe } from '../../shared/pipes/short-id.pipe';

type ActionKey = AuditEntry['action'];

const ACTION_LABEL: Record<ActionKey, string> = {
  upload: 'Subida',
  read: 'Lectura',
  download: 'Descarga',
  edit: 'Edición',
  delete: 'Eliminación',
  verify: 'Verificación',
};

const ACTION_CLASS: Record<ActionKey, string> = {
  upload: 'badge bg-emerald-50 text-emerald-700',
  read: 'badge bg-stone-100 text-stone-700',
  download: 'badge bg-indigo-50 text-indigo-700',
  edit: 'badge bg-amber-50 text-amber-700',
  delete: 'badge bg-red-50 text-red-700',
  verify: 'badge bg-teal-50 text-teal-700',
};

/**
 * Document audit log viewer. Loads audit entries (optionally filtered by
 * document/action) alongside document titles, and supports expanding an entry
 * to inspect its metadata.
 */
@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, ShortIdPipe],
  templateUrl: './audit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditComponent {
  private readonly service = inject(DocumentsService);

  readonly entries = signal<AuditEntry[]>([]);
  readonly documents = signal<DocumentRecord[]>([]);
  readonly loading = signal(true);
  readonly expandedId = signal<string | null>(null);

  documentId = '';
  actionFilter: ActionKey | '' = '';

  readonly documentTitleMap = computed(() => {
    const map = new Map<string, string>();
    for (const d of this.documents()) map.set(d.id, d.title);
    return map;
  });

  readonly filtered = computed(() => {
    const list = this.entries();
    if (!this.actionFilter) return list;
    return list.filter((e) => e.action === this.actionFilter);
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [entries, docs] = await Promise.all([
        this.service.listAudit({ documentId: this.documentId || undefined }),
        this.service.list().catch(() => []),
      ]);
      this.entries.set(entries);
      this.documents.set(docs);
    } finally {
      this.loading.set(false);
    }
  }

  actionLabel(a: ActionKey): string {
    return ACTION_LABEL[a];
  }

  actionClass(a: ActionKey): string {
    return ACTION_CLASS[a];
  }

  documentLabel(id: string | null): string {
    if (!id) return '—';
    return this.documentTitleMap().get(id) ?? `Documento ${id.slice(0, 8)}…`;
  }

  metadataPretty(meta: Record<string, unknown>): string {
    try {
      return JSON.stringify(meta, null, 2);
    } catch {
      return String(meta);
    }
  }

  toggleExpand(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }
}
