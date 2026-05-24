import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface DownloadResponse {
  url: string;
  expiresIn: number;
}

interface CachedUrl {
  url: string;
  fetchedAt: number;
}

/**
 * Resolves Express-document IDs (used for product images, catalog assets, etc.)
 * to presigned display URLs. Caches per documentId for the duration of the
 * presign expiry minus a safety margin so we don't re-fetch on every render.
 */
@Injectable({ providedIn: 'root' })
export class DocumentDisplayService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, CachedUrl>();
  // Express defaults to 15 min presign; refresh 30 s before it expires.
  private readonly ttlMs = (15 * 60 - 30) * 1000;

  async getDisplayUrl(documentId: string): Promise<string | null> {
    const cached = this.cache.get(documentId);
    if (cached && Date.now() - cached.fetchedAt < this.ttlMs) {
      return cached.url;
    }
    try {
      const resp = await firstValueFrom(
        this.http.get<DownloadResponse>(`${environment.documentsApiUrl}/documents/${documentId}/download-url`),
      );
      this.cache.set(documentId, { url: resp.url, fetchedAt: Date.now() });
      return resp.url;
    } catch {
      return null;
    }
  }

  invalidate(documentId?: string): void {
    if (documentId) this.cache.delete(documentId);
    else this.cache.clear();
  }
}
