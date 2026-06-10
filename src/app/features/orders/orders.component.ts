import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Order, Sale } from '../../shared/models';
import { OrdersService } from './orders.service';

type Tab = 'sales' | 'orders';

/**
 * CU06 — Orquestar estados del pedido.
 *
 * Logistics/admin console that lists sales and orders, lets staff confirm a
 * pending sale (confirmSale: Sale pending -> confirmed, which creates the Order
 * with code ORD-YYYYMMDD-#### and enqueues the signed invoice webhook), and
 * shows the resulting order lifecycle (placed -> preparing -> ready ->
 * delivered). Order-state advancement beyond creation is read-only here because
 * the Go core exposes no mutation for it (and the CU06 diagrams do not require
 * one); the actionable transition is the sale confirmation.
 */
@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersComponent {
  private readonly orders = inject(OrdersService);

  readonly tab = signal<Tab>('sales');
  readonly sales = signal<Sale[]>([]);
  readonly orderList = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly selectedSale = signal<Sale | null>(null);
  readonly selectedOrder = signal<Order | null>(null);

  saleStatus: '' | 'pending' | 'confirmed' | 'cancelled' = '';
  orderStatus: '' | 'placed' | 'preparing' | 'ready' | 'delivered' | 'cancelled' = '';

  readonly orderStages: ReadonlyArray<'placed' | 'preparing' | 'ready' | 'delivered'> = [
    'placed',
    'preparing',
    'ready',
    'delivered',
  ];

  constructor() {
    void this.refresh();
  }

  trackById(_: number, row: { id: string }): string {
    return row.id;
  }

  setTab(t: Tab): void {
    if (this.tab() === t) return;
    this.tab.set(t);
    this.closeDetail();
    this.success.set(null);
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      if (this.tab() === 'sales') {
        this.sales.set(await this.orders.listSales(this.saleStatus || undefined));
      } else {
        this.orderList.set(await this.orders.listOrders(this.orderStatus || undefined));
      }
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'Error al cargar los datos');
    } finally {
      this.loading.set(false);
    }
  }

  async confirm(sale: Sale): Promise<void> {
    if (sale.status !== 'pending' || this.busyId()) return;
    if (!confirm('¿Confirmar la venta y generar el pedido? Descuenta inventario y dispara la factura.')) return;
    this.busyId.set(sale.id);
    this.error.set(null);
    this.success.set(null);
    try {
      const order = await this.orders.confirmSale(sale.id);
      this.success.set(`Pedido ${order.code} creado · estado ${order.status}.`);
      await this.refresh();
    } catch (e) {
      this.error.set((e as { message?: string }).message ?? 'No se pudo confirmar la venta');
    } finally {
      this.busyId.set(null);
    }
  }

  async openSale(sale: Sale): Promise<void> {
    this.selectedOrder.set(null);
    this.selectedSale.set(sale);
    try {
      const full = await this.orders.getSale(sale.id);
      if (full) this.selectedSale.set(full);
    } catch {
      /* keep the row-level projection on detail-load failure */
    }
  }

  async openOrder(order: Order): Promise<void> {
    this.selectedSale.set(null);
    this.selectedOrder.set(order);
    try {
      const full = await this.orders.getOrder(order.id);
      if (full) this.selectedOrder.set(full);
    } catch {
      /* keep the row-level projection on detail-load failure */
    }
  }

  closeDetail(): void {
    this.selectedSale.set(null);
    this.selectedOrder.set(null);
  }

  saleBadge(status: string): string {
    switch (status) {
      case 'pending':
        return 'badge-pending';
      case 'confirmed':
        return 'badge-active';
      default:
        return 'badge-deleted';
    }
  }

  orderBadge(status: string): string {
    switch (status) {
      case 'placed':
        return 'badge-pending';
      case 'preparing':
        return 'badge bg-sky-50 text-sky-700';
      case 'ready':
        return 'badge bg-violet-50 text-violet-700';
      case 'delivered':
        return 'badge-active';
      default:
        return 'badge-deleted';
    }
  }

  stageReached(status: string, stage: string): boolean {
    if (status === 'cancelled') return false;
    return this.orderStages.indexOf(status as 'placed') >= this.orderStages.indexOf(stage as 'placed');
  }

  itemCount(sale: Sale | null | undefined): number {
    return (sale?.items ?? []).reduce((sum, i) => sum + i.quantity, 0);
  }

  money(value: number, currency: string): string {
    try {
      return new Intl.NumberFormat('es-BO', { style: 'currency', currency: currency || 'BOB' }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  }
}
