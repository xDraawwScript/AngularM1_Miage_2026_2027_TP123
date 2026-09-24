import { Component, computed, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpEventType } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Track } from '../../shared/models/track.model';
import { TrackService } from '../../shared/services/track.service';
import { FrenchPaginatorIntl } from './mat-paginator-intl-fr';

/** Miroir des contrôles déjà appliqués côté backend (backend/src/app.js). */
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
]);
const MAX_FILE_SIZE = 25 * 1024 * 1024;

@Component({
  imports: [ReactiveFormsModule, MatPaginatorModule],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.css',
  providers: [{ provide: MatPaginatorIntl, useClass: FrenchPaginatorIntl }],
})
export class TracksPageComponent implements OnDestroy {
  private readonly service = inject(TrackService);

  /**
   * mat-paginator gère un état interne à lui (il avance visuellement dès le clic,
   * avant même la réponse du serveur) : contrairement à nos anciens boutons faits
   * main, rebinder `[pageIndex]` avec la même valeur qu'avant ne suffit pas à le
   * faire revenir en arrière si Angular ne détecte aucun changement de valeur.
   * D'où la resynchronisation manuelle dans le callback d'erreur de `load()`.
   */
  @ViewChild(MatPaginator) private paginator?: MatPaginator;

  /** Pour vider l'affichage natif de l'input file après un envoi réussi. */
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  readonly tracks = signal<Track[]>([]);
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly audioUrl = signal('');
  readonly title = new FormControl('', { nonNullable: true });
  readonly uploadError = signal('');
  readonly uploadProgress = signal<number | null>(null);
  file?: File;

  readonly filterTitle = new FormControl('', { nonNullable: true });
  private readonly filterValue = toSignal(this.filterTitle.valueChanges, { initialValue: '' });

  /** Filtre côté client, sur la page actuellement chargée (pas de nouvelle route serveur). */
  readonly filteredTracks = computed(() => {
    const query = this.filterValue().trim().toLowerCase();
    if (!query) return this.tracks();
    return this.tracks().filter((track) => track.title.toLowerCase().includes(query));
  });

  constructor() {
    document.body.classList.add('theme-fleetwood');
    this.load();
  }

  ngOnDestroy(): void {
    document.body.classList.remove('theme-fleetwood');
    const url = this.audioUrl();
    if (url) URL.revokeObjectURL(url);
  }

  /**
   * Miroir des vérifications déjà faites côté backend (format + taille) : un
   * retour instantané ici améliore l'expérience, mais ne dispense jamais le
   * serveur de refaire exactement les mêmes contrôles de son côté.
   */
  choose(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0];
    this.uploadError.set('');
    this.file = undefined;

    if (!selected) return;

    if (!ALLOWED_AUDIO_TYPES.has(selected.type)) {
      this.uploadError.set('Format non accepté (MP3, WAV, OGG ou M4A uniquement).');
      input.value = '';
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      this.uploadError.set('Fichier trop volumineux (25 Mo maximum).');
      input.value = '';
      return;
    }

    this.file = selected;
    console.debug('[TracksPage] Fichier sélectionné', this.file.name);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} Ko`;
    return `${(kb / 1024).toFixed(1)} Mo`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /**
   * `targetPage` n'est écrit dans le signal `page` qu'après succès de la requête :
   * en cas d'échec, l'étiquette de pagination affichée reste cohérente avec les
   * pistes réellement affichées (pas de "Page 2" avec le contenu de la page 1).
   */
  load(targetPage = this.page()): void {
    this.loading.set(true);
    this.error.set('');
    this.service.list(targetPage).subscribe({
      next: (response) => {
        console.debug('[TracksPage] Pistes chargées', response.items.length);
        this.tracks.set(response.items);
        this.pages.set(response.pages);
        this.total.set(response.total);
        this.page.set(targetPage);
        this.loading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Chargement impossible', error);
        this.error.set(error.error?.message ?? 'Impossible de charger la bibliothèque');
        this.loading.set(false);
        if (this.paginator) {
          this.paginator.pageIndex = this.page() - 1;
        }
      },
    });
  }

  /** mat-paginator est indexé à partir de 0, l'appli à partir de 1. */
  onPageEvent(event: PageEvent): void {
    this.load(event.pageIndex + 1);
  }

  upload(): void {
    if (!this.file || this.uploadProgress() !== null) return;

    this.uploadProgress.set(0);
    this.uploadError.set('');
    this.service.upload(this.file, this.title.value || this.file.name).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round((100 * event.loaded) / event.total));
        } else if (event.type === HttpEventType.Response) {
          console.debug('[TracksPage] Piste envoyée', event.body?.id);
          this.uploadProgress.set(null);
          this.title.setValue('');
          this.file = undefined;
          if (this.fileInput) this.fileInput.nativeElement.value = '';
          this.load(1);
        }
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Envoi impossible', error);
        this.uploadProgress.set(null);
        this.uploadError.set(error.error?.message ?? "Échec de l'envoi, réessayez.");
      },
    });
  }

  play(track: Track): void {
    this.service.audio(track.id).subscribe({
      next: (blob) => {
        console.debug('[TracksPage] Audio chargé', track.id);
        const previousUrl = this.audioUrl();
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        this.audioUrl.set(URL.createObjectURL(blob));
      },
      error: (error) => console.error('[TracksPage] Lecture impossible', error),
    });
  }

  remove(track: Track): void {
    if (!confirm(`Supprimer « ${track.title} » ?`)) return;

    this.service.remove(track.id).subscribe({
      next: () => {
        console.debug('[TracksPage] Piste supprimée', track.id);
        this.load();
      },
      error: (error) => console.error('[TracksPage] Suppression impossible', error),
    });
  }
}
