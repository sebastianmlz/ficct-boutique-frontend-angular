import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { Branch, InventoryEntry } from '../../shared/models';
import { ProductImageComponent } from '../../shared/components/product-image/product-image.component';

const BRANCHES_QUERY = gql`query InventoryBranches { branches { id code name } }`;

const INVENTORY_PAGE = gql`
  query InventoryPage($filter: InventoryFilter, $limit: Int, $offset: Int) {
    inventoryEntries(filter: $filter, limit: $limit, offset: $offset) {
      total
      limit
      offset
      entries {
        id
        variantId
        quantity
        reorderLevel
        updatedAt
        branch { id code name }
        variant { id sku size color isActive }
        product { id sku name category imageUrl imageDocumentId }
      }
    }
  }
`;

const SET_STOCK = gql`
  mutation SetStock($variantId: UUID!, $branchId: UUID!, $quantity: Int!) {
    setInventoryStock(variantId: $variantId, branchId: $branchId, quantity: $quantity) {
      id quantity updatedAt
    }
  }
`;

const ADJUST_STOCK = gql`
  mutation AdjustStock($variantId: UUID!, $branchId: UUID!, $delta: Int!) {
    adjustInventoryStock(variantId: $variantId, branchId: $branchId, delta: $delta) {
      id quantity updatedAt
    }
  }
`;

const SET_REORDER = gql`
  mutation SetReorder($variantId: UUID!, $branchId: UUID!, $reorderLevel: Int!) {
    updateInventoryReorderLevel(variantId: $variantId, branchId: $branchId, reorderLevel: $reorderLevel) {
      id reorderLevel updatedAt
    }
  }
`;

const DEACTIVATE_VARIANT = gql`
  mutation DeactivateVariant($id: UUID!) { deactivateVariant(id: $id) { id isActive } }
`;

const ACTIVATE_VARIANT = gql`
  mutation ActivateVariant($id: UUID!) { activateVariant(id: $id) { id isActive } }
`;

/**
 * Inventory management screen. Lists paginated, filterable stock entries per
 * branch/variant and lets staff set or adjust stock, change reorder levels and
 * activate/deactivate variants via GraphQL mutations.
 */
@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductImageComponent],
  templateUrl: './inventory.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryComponent {
  private readonly apollo = inject(Apollo);

  readonly branches = signal<Branch[]>([]);
  readonly entries = signal<InventoryEntry[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly busyId = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  branchId = '';
  search = '';
  size = '';
  color = '';
  status: '' | 'ok' | 'low' | 'critical' | 'inactive' = '';
  onlyLowStock = false;
  includeInactiveVariants = false;

  page = 1;
  pageSize = 25;

  trackByEntryId(_: number, e: InventoryEntry): string {
    return e.id;
  }

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));
  readonly summary = computed(() => {
    const list = this.entries();
    const totalUnits = list.reduce((s, e) => s + e.quantity, 0);
    const low = list.filter((e) => e.quantity <= e.reorderLevel && (e.variant?.isActive ?? true)).length;
    return { totalUnits, low, count: list.length };
  });

  constructor() {
    void this.bootstrap();
  }

  async bootstrap(): Promise<void> {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.apollo.query<{ branches: Branch[] }>({ query: BRANCHES_QUERY, fetchPolicy: 'network-only' }));
      this.branches.set(r.data?.branches ?? []);
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'Error al cargar sucursales');
    } finally {
      this.loading.set(false);
    }
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const filter: Record<string, unknown> = {};
      if (this.branchId) filter['branchId'] = this.branchId;
      if (this.search.trim()) filter['search'] = this.search.trim();
      if (this.size) filter['size'] = this.size;
      if (this.color) filter['color'] = this.color;
      if (this.status) filter['status'] = this.status;
      if (this.onlyLowStock) filter['onlyLowStock'] = true;
      if (this.includeInactiveVariants) filter['includeInactiveVariants'] = true;

      const offset = (this.page - 1) * this.pageSize;
      const r = await firstValueFrom(
        this.apollo.query<{
          inventoryEntries: { entries: InventoryEntry[]; total: number; limit: number; offset: number };
        }>({
          query: INVENTORY_PAGE,
          variables: { filter, limit: this.pageSize, offset },
          fetchPolicy: 'network-only',
        }),
      );
      const page = r.data?.inventoryEntries;
      if (page) {
        this.entries.set(page.entries);
        this.total.set(page.total);
      }
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'Error');
    } finally {
      this.loading.set(false);
    }
  }

  resetFilters(): void {
    this.branchId = '';
    this.search = '';
    this.size = '';
    this.color = '';
    this.status = '';
    this.onlyLowStock = false;
    this.includeInactiveVariants = false;
    this.page = 1;
    void this.load();
  }

  applyFilters(): void {
    this.page = 1;
    void this.load();
  }

  async adjust(e: InventoryEntry, delta: number): Promise<void> {
    this.busyId.set(e.id);
    try {
      await firstValueFrom(this.apollo.mutate({ mutation: ADJUST_STOCK, variables: { variantId: e.variantId, branchId: e.branch.id, delta } }));
      await this.load();
    } catch (err) {
      this.error.set((err as { message?: string }).message ?? 'Error al ajustar stock');
    } finally {
      this.busyId.set(null);
    }
  }

  async setStock(e: InventoryEntry, value: number): Promise<void> {
    if (!Number.isFinite(value) || value < 0) return;
    if (value === e.quantity) return;
    this.busyId.set(e.id);
    try {
      await firstValueFrom(this.apollo.mutate({ mutation: SET_STOCK, variables: { variantId: e.variantId, branchId: e.branch.id, quantity: value } }));
      await this.load();
    } catch (err) {
      this.error.set((err as { message?: string }).message ?? 'Error al fijar stock');
    } finally {
      this.busyId.set(null);
    }
  }

  async setReorder(e: InventoryEntry, value: number): Promise<void> {
    if (!Number.isFinite(value) || value < 0) return;
    if (value === e.reorderLevel) return;
    this.busyId.set(e.id);
    try {
      await firstValueFrom(this.apollo.mutate({ mutation: SET_REORDER, variables: { variantId: e.variantId, branchId: e.branch.id, reorderLevel: value } }));
      await this.load();
    } catch (err) {
      this.error.set((err as { message?: string }).message ?? 'Error al fijar reorden');
    } finally {
      this.busyId.set(null);
    }
  }

  async toggleVariantActive(e: InventoryEntry): Promise<void> {
    if (!e.variant) return;
    const willActivate = !e.variant.isActive;
    if (!confirm(willActivate ? '¿Reactivar esta variante?' : '¿Desactivar esta variante? Dejará de ser vendible.')) return;
    this.busyId.set(e.id);
    try {
      await firstValueFrom(this.apollo.mutate({ mutation: willActivate ? ACTIVATE_VARIANT : DEACTIVATE_VARIANT, variables: { id: e.variant.id } }));
      await this.load();
    } catch (err) {
      this.error.set((err as { message?: string }).message ?? 'Error al cambiar estado');
    } finally {
      this.busyId.set(null);
    }
  }

  statusFor(e: InventoryEntry): { label: string; className: string } {
    if (e.variant && !e.variant.isActive) return { label: 'Inactivo', className: 'badge-deleted' };
    if (e.quantity === 0) return { label: 'Crítico', className: 'badge bg-red-50 text-red-700' };
    if (e.quantity <= e.reorderLevel) return { label: 'Bajo stock', className: 'badge-pending' };
    return { label: 'OK', className: 'badge-active' };
  }

  goPrev(): void { if (this.page > 1) { this.page--; void this.load(); } }
  goNext(): void { if (this.page < this.pageCount()) { this.page++; void this.load(); } }
  onPageSizeChange(): void { this.page = 1; void this.load(); }
  onCellBlur(ev: FocusEvent, e: InventoryEntry, field: 'stock' | 'reorder'): void {
    const v = Number((ev.target as HTMLInputElement).value);
    if (field === 'stock') void this.setStock(e, v);
    else void this.setReorder(e, v);
  }
}
