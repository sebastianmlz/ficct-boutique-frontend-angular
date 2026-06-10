import { ChartConfiguration, ChartOptions } from 'chart.js';

const BOUTIQUE_INK = '#1c1917';
const BOUTIQUE_ACCENT = '#9a3412';
const BOUTIQUE_MUTE = '#78716c';
const BOUTIQUE_LINE = '#e7e5e4';

const PALETTE = [BOUTIQUE_INK, BOUTIQUE_ACCENT, '#0f766e', '#7c3aed', '#b45309', '#0369a1', '#9f1239'];

export function bobCurrency(value: number): string {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(value);
}

export function spanishMonthShort(iso: string): string {
  return new Date(iso).toLocaleDateString('es-BO', { month: 'short', year: '2-digit' });
}

export function spanishMonthLong(iso: string): string {
  return new Date(iso).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' });
}

export function monthlyBarOptions(): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: BOUTIQUE_INK,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: BOUTIQUE_INK,
        borderWidth: 0,
        cornerRadius: 6,
        padding: 12,
        callbacks: {
          label: (ctx) => ` ${bobCurrency(Number(ctx.parsed.y ?? 0))}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: BOUTIQUE_MUTE, font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: BOUTIQUE_LINE, drawTicks: false },
        ticks: {
          color: BOUTIQUE_MUTE,
          font: { size: 11 },
          callback: (val) => `Bs ${val}`,
        },
        border: { display: false },
      },
    },
  };
}

export function monthlyBarData(months: { month: string; totalSales: number }[]): ChartConfiguration<'bar'>['data'] {
  return {
    labels: months.map((m) => spanishMonthShort(m.month)),
    datasets: [
      {
        data: months.map((m) => m.totalSales),
        backgroundColor: BOUTIQUE_INK,
        hoverBackgroundColor: BOUTIQUE_ACCENT,
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 56,
      },
    ],
  };
}

export function horizontalBarData(rows: { label: string; value: number }[]): ChartConfiguration<'bar'>['data'] {
  return {
    labels: rows.map((r) => r.label),
    datasets: [
      {
        data: rows.map((r) => r.value),
        backgroundColor: PALETTE.slice(0, rows.length),
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 28,
      },
    ],
  };
}

export function horizontalBarOptions(unitsLabel = 'unidades'): ChartOptions<'bar'> {
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: BOUTIQUE_INK,
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.x} ${unitsLabel}`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: BOUTIQUE_LINE, drawTicks: false },
        ticks: { color: BOUTIQUE_MUTE, font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        ticks: { color: BOUTIQUE_INK, font: { size: 12, weight: 500 } },
      },
    },
  };
}

export function forecastLineData(points: { period_index: number; value: number }[]): ChartConfiguration<'line'>['data'] {
  return {
    labels: points.map((p) => `t+${p.period_index}`),
    datasets: [
      {
        data: points.map((p) => p.value),
        borderColor: BOUTIQUE_ACCENT,
        backgroundColor: 'rgba(154, 52, 18, 0.12)',
        pointBackgroundColor: BOUTIQUE_ACCENT,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.35,
        fill: true,
      },
    ],
  };
}

export function forecastLineOptions(): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: BOUTIQUE_INK,
        callbacks: {
          label: (ctx) => ` ${Number(ctx.parsed.y).toFixed(1)} unidades estimadas`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: BOUTIQUE_MUTE },
      },
      y: {
        grid: { color: BOUTIQUE_LINE, drawTicks: false },
        ticks: { color: BOUTIQUE_MUTE },
        border: { display: false },
      },
    },
  };
}

export interface RfmSegmentRow {
  customer_id: string;
  cluster: number;
  distance: number;
  recency_days?: number;
  frequency?: number;
  monetary?: number;
}

/**
 * RFM scatter for CU09: x = Recency (days), y = Monetary (Bs), bubble size =
 * Frequency, colour = KMeans cluster. This plots the actual RFM features the
 * model clustered on, grouped by the assigned segment.
 */
export function clusterScatterData(rows: RfmSegmentRow[]): ChartConfiguration<'bubble'>['data'] {
  const maxFreq = Math.max(1, ...rows.map((r) => r.frequency ?? 0));
  const groups = new Map<number, RfmSegmentRow[]>();
  for (const r of rows) {
    if (!groups.has(r.cluster)) groups.set(r.cluster, []);
    groups.get(r.cluster)!.push(r);
  }
  return {
    datasets: Array.from(groups.entries()).map(([cluster, items]) => ({
      label: `Cluster ${cluster}`,
      data: items.map((it) => ({
        x: it.recency_days ?? 0,
        y: it.monetary ?? 0,
        r: 6 + ((it.frequency ?? 0) / maxFreq) * 14,
      })),
      backgroundColor: PALETTE[cluster % PALETTE.length] + 'cc',
      borderColor: PALETTE[cluster % PALETTE.length],
    })),
  };
}

export function clusterScatterOptions(): ChartOptions<'bubble'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: BOUTIQUE_INK, font: { size: 12 } } },
      tooltip: {
        backgroundColor: BOUTIQUE_INK,
        callbacks: {
          label: (ctx) => ` Recency ${Number(ctx.parsed.x)} d · Monetary Bs ${Number(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Recency (días) — menor = más reciente', color: BOUTIQUE_MUTE },
        grid: { color: BOUTIQUE_LINE, drawTicks: false },
        ticks: { color: BOUTIQUE_MUTE },
        border: { display: false },
      },
      y: {
        title: { display: true, text: 'Monetary (Bs) — tamaño = Frequency', color: BOUTIQUE_MUTE },
        beginAtZero: true,
        grid: { color: BOUTIQUE_LINE, drawTicks: false },
        ticks: { color: BOUTIQUE_MUTE },
        border: { display: false },
      },
    },
  };
}
