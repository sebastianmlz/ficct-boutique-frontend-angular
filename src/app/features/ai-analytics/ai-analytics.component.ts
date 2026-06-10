import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NgChartsModule } from 'ng2-charts';
import { environment } from '../../../environments/environment';
import {
  clusterScatterData,
  clusterScatterOptions,
  forecastLineData,
  forecastLineOptions,
} from '../../shared/charts/chart-defaults';

interface ForecastPoint { period_index: number; value: number; }
interface ForecastResult { scope: string; horizon: number; computed_at: string; points: ForecastPoint[]; }
interface Segment {
  customer_id: string;
  cluster: number;
  distance: number;
  recency_days?: number;
  frequency?: number;
  monetary?: number;
  run_id?: string;
}

@Component({
  selector: 'app-ai-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './ai-analytics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAnalyticsComponent {
  private readonly http = inject(HttpClient);
  private readonly base = environment.aiApiUrl;

  scope = 'category:vestidos';
  seriesText = '12, 15, 11, 18, 22, 27, 30, 28';
  horizon = 4;
  readonly forecast = signal<ForecastResult | null>(null);
  readonly forecastBusy = signal(false);
  readonly forecastError = signal<string | null>(null);

  clusterCsv = `c1,5,12,5000\nc2,8,10,4800\nc3,3,15,5200\nc4,180,1,80\nc5,220,1,100\nc6,200,2,90`;
  k = 2;
  readonly segments = signal<Segment[]>([]);
  readonly clusterBusy = signal(false);
  readonly clusterError = signal<string | null>(null);

  readonly forecastChartData = computed(() => forecastLineData(this.forecast()?.points ?? []));
  readonly forecastChartOptions = forecastLineOptions();
  readonly clusterChartData = computed(() => clusterScatterData(this.segments()));
  readonly clusterChartOptions = clusterScatterOptions();

  async runForecast(): Promise<void> {
    this.forecastBusy.set(true);
    this.forecastError.set(null);
    try {
      const series = this.seriesText.split(/[\s,]+/).filter(Boolean).map((n) => Number(n)).filter((n) => Number.isFinite(n));
      const r = await firstValueFrom(this.http.post<ForecastResult>(`${this.base}/forecasting/run/`, { scope: this.scope, series, horizon: this.horizon }));
      this.forecast.set(r);
    } catch (e) {
      this.forecastError.set((e as { message?: string }).message ?? 'Error');
    } finally {
      this.forecastBusy.set(false);
    }
  }

  async runCluster(): Promise<void> {
    this.clusterBusy.set(true);
    this.clusterError.set(null);
    try {
      const customers = this.clusterCsv
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const [id, rec, freq, mon] = l.split(',').map((x) => x.trim());
          return { customer_id: id, recency_days: Number(rec), frequency: Number(freq), monetary: Number(mon) };
        });
      const r = await firstValueFrom(
        this.http.post<{ segments: Segment[] }>(`${this.base}/clustering/run/`, { customers, k: this.k }),
      );
      this.segments.set(r.segments);
      // CU09: after the run, read back the persisted segments (GET /clustering/segments/).
      try {
        await this.fetchSegments();
      } catch {
        /* keep the run response if the read-back fails */
      }
    } catch (e) {
      this.clusterError.set((e as { message?: string }).message ?? 'Error');
    } finally {
      this.clusterBusy.set(false);
    }
  }

  /** Load the persisted segments (GET /clustering/segments/) without re-running KMeans. */
  async loadSegments(): Promise<void> {
    this.clusterBusy.set(true);
    this.clusterError.set(null);
    try {
      await this.fetchSegments();
    } catch (e) {
      this.clusterError.set((e as { message?: string }).message ?? 'Error');
    } finally {
      this.clusterBusy.set(false);
    }
  }

  private async fetchSegments(): Promise<void> {
    const r = await firstValueFrom(this.http.get<{ segments: Segment[] }>(`${this.base}/clustering/segments/`));
    this.segments.set(r.segments ?? []);
  }

  clusterColor(c: number): string {
    const palette = ['bg-stone-900', 'bg-amber-700', 'bg-teal-700', 'bg-violet-700', 'bg-rose-700'];
    return palette[c % palette.length];
  }
}
