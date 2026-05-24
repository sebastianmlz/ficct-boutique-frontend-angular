import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Apollo, gql } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { NgChartsModule } from 'ng2-charts';
import {
  bobCurrency,
  horizontalBarData,
  horizontalBarOptions,
  monthlyBarData,
  monthlyBarOptions,
} from '../../shared/charts/chart-defaults';
import { DashboardSummary, MonthlySalePoint, PopularProductRow } from '../../shared/models';

const DASHBOARD_QUERY = gql`
  query Dashboard {
    dashboardSummary {
      todaySales
      todayOrders
      pendingOrders
      lowStockCount
      activeProducts
      activeBranches
    }
    monthlySales(months: 6) {
      month
      totalSales
      saleCount
    }
    popularProducts(limit: 5) {
      productId
      productName
      unitsSold
      revenue
    }
  }
`;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly apollo = inject(Apollo);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly monthly = signal<MonthlySalePoint[]>([]);
  readonly popular = signal<PopularProductRow[]>([]);

  readonly monthlyChartData = computed(() => monthlyBarData(this.monthly()));
  readonly monthlyChartOptions = monthlyBarOptions();
  readonly popularChartData = computed(() =>
    horizontalBarData(this.popular().map((p) => ({ label: p.productName, value: p.unitsSold }))),
  );
  readonly popularChartOptions = horizontalBarOptions('unidades');

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(
        this.apollo.query<{
          dashboardSummary: DashboardSummary;
          monthlySales: MonthlySalePoint[];
          popularProducts: PopularProductRow[];
        }>({ query: DASHBOARD_QUERY }),
      );
      if (result.errors?.length) this.error.set(result.errors[0].message);
      this.summary.set(result.data?.dashboardSummary ?? null);
      this.monthly.set(result.data?.monthlySales ?? []);
      this.popular.set(result.data?.popularProducts ?? []);
    } catch (err) {
      this.error.set((err as { message?: string }).message ?? 'Error al cargar el tablero');
    } finally {
      this.loading.set(false);
    }
  }

  formatCurrency(value: number): string {
    return bobCurrency(value);
  }
}
