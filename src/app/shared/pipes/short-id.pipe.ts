import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'shortId', standalone: true })
export class ShortIdPipe implements PipeTransform {
  transform(value: string | null | undefined, head = 8, tail = 4): string {
    if (!value) return '—';
    if (value.length <= head + tail + 1) return value;
    return `${value.slice(0, head)}…${value.slice(-tail)}`;
  }
}
