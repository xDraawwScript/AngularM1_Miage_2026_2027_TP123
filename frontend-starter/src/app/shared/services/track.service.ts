import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Page } from '../models/page.model';
import { Track } from '../models/track.model';

/** Nombre de pistes affichées par page (envoyé au serveur dans `limit`, repris par le paginateur). */
export const TRACKS_PER_PAGE = 6;

/** Encapsulates all HTTP operations for backing tracks. */
@Injectable({ providedIn: 'root' })
export class TrackService {
  private readonly http = inject(HttpClient);

  list(page = 1, limit = TRACKS_PER_PAGE) {
    return this.http.get<Page<Track>>('/api/tracks', {
      params: { page, limit },
    });
  }

  /** `reportUploadProgress`/`observe: 'events'` exposent la progression de l'upload (backend XHR requis, voir main.ts). */
  upload(file: File, title: string) {
    const body = new FormData();
    body.append('audio', file);
    body.append('title', title);
    return this.http.post<Track>('/api/tracks', body, {
      reportUploadProgress: true,
      observe: 'events',
    });
  }

  audio(id: string) {
    return this.http.get(`/api/tracks/${id}/audio`, {
      responseType: 'blob',
    });
  }

  remove(id: string) {
    return this.http.delete<void>(`/api/tracks/${id}`);
  }
}
