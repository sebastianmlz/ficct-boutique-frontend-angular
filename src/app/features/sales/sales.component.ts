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
  spanishMonthLong,
} from '../../shared/charts/chart-defaults';
import { MonthlySalePoint, PopularProductRow } from '../../shared/models';

const QUERY = gql`
  query SalesPanel {
    monthlySales(months: 12) { month totalSales saleCount }
    popularProducts(limit: 10) { productId productName unitsSold revenue }
  }
`;

/**
 * Sales analytics panel. Fetches 12-month sales totals and the top-selling
 * products, then exposes chart data and aggregate totals for the template.
 */
@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './sales.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesComponent {
  private readonly apollo = inject(Apollo);
  readonly monthly = signal<MonthlySalePoint[]>([]);
  readonly popular = signal<PopularProductRow[]>([]);
  readonly loading = signal(true);

  readonly monthlyChartData = computed(() => monthlyBarData(this.monthly()));
  readonly monthlyChartOptions = monthlyBarOptions();
  readonly popularChartData = computed(() =>
    horizontalBarData(this.popular().slice(0, 10).map((p) => ({ label: p.productName, value: p.unitsSold }))),
  );
  readonly popularChartOptions = horizontalBarOptions('unidades');

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.apollo.query<{ monthlySales: MonthlySalePoint[]; popularProducts: PopularProductRow[] }>({ query: QUERY }));
      this.monthly.set(r.data?.monthlySales ?? []);
      this.popular.set(r.data?.popularProducts ?? []);
    } finally {
      this.loading.set(false);
    }
  }

  formatCurrency(v: number): string {
    return bobCurrency(v);
  }

  formatMonth(iso: string): string {
    return spanishMonthLong(iso);
  }

  totalSalesYear(): number {
    return this.monthly().reduce((s, p) => s + p.totalSales, 0);
  }

  totalUnitsTop(): number {
    return this.popular().reduce((s, r) => s + r.unitsSold, 0);
  }
}
