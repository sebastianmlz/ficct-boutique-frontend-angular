import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { Product } from '../../shared/models';
import { AuthService } from '../../core/auth/auth.service';
import { ProductImageComponent } from '../../shared/components/product-image/product-image.component';
import { bobCurrency } from '../../shared/charts/chart-defaults';

const PRODUCTS_QUERY = gql`
  query Products($category: String, $search: String, $includeInactive: Boolean) {
    products(category: $category, search: $search, includeInactive: $includeInactive, limit: 100) {
      id
      sku
      name
      category
      basePrice
      currency
      imageUrl
      imageDocumentId
      isActive
      variants {
        id
        size
        color
        isActive
      }
      createdAt
    }
  }
`;

const DEACTIVATE = gql`
  mutation Deactivate($id: UUID!) {
    deactivateProduct(id: $id) { id isActive }
  }
`;

const ACTIVATE = gql`
  mutation Activate($id: UUID!) {
    activateProduct(id: $id) { id isActive }
  }
`;

/**
 * Product catalogue list. Loads filterable products (by category/search and
 * optionally inactive ones) and lets staff activate or deactivate a product.
 */
@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProductImageComponent],
  templateUrl: './products-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsListComponent {
  private readonly apollo = inject(Apollo);
  readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly products = signal<Product[]>([]);
  readonly busyId = signal<string | null>(null);
  category = '';
  search = '';
  includeInactive = false;

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(
        this.apollo.query<{ products: Product[] }>({
          query: PRODUCTS_QUERY,
          variables: {
            category: this.category || null,
            search: this.search || null,
            includeInactive: this.includeInactive,
          },
          fetchPolicy: 'network-only',
        }),
      );
      this.products.set(result.data?.products ?? []);
      if (result.errors?.length) this.error.set(result.errors[0].message);
    } catch (err) {
      this.error.set((err as { message?: string }).message ?? 'Error al cargar productos');
    } finally {
      this.loading.set(false);
    }
  }

  async deactivate(p: Product): Promise<void> {
    if (!confirm(`¿Desactivar "${p.name}"? Dejará de aparecer en el catálogo público.`)) return;
    this.busyId.set(p.id);
    try {
      await firstValueFrom(this.apollo.mutate({ mutation: DEACTIVATE, variables: { id: p.id } }));
      await this.load();
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'Error al desactivar');
    } finally {
      this.busyId.set(null);
    }
  }

  async activate(p: Product): Promise<void> {
    this.busyId.set(p.id);
    try {
      await firstValueFrom(this.apollo.mutate({ mutation: ACTIVATE, variables: { id: p.id } }));
      await this.load();
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'Error al reactivar');
    } finally {
      this.busyId.set(null);
    }
  }

  formatCurrency(v: number): string {
    return bobCurrency(v);
  }

  variantSummary(p: Product): string {
    if (p.variants.length === 0) return 'Sin variantes';
    const sizes = new Set(p.variants.map((v) => v.size));
    const colors = new Set(p.variants.map((v) => v.color));
    return `${p.variants.length} variantes · ${sizes.size} talles · ${colors.size} colores`;
  }
}
