import { Component, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Track } from '../../shared/models/track.model';
import { TrackService } from '../../shared/services/track.service';
import { FrenchPaginatorIntl } from './mat-paginator-intl-fr';

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

  readonly tracks = signal<Track[]>([]);
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly audioUrl = signal('');
  readonly title = new FormControl('', { nonNullable: true });
  file?: File;

  constructor() {
    document.body.classList.add('theme-fleetwood');
    this.load();
  }

  ngOnDestroy(): void {
    document.body.classList.remove('theme-fleetwood');
  }

  choose(event: Event): void {
    this.file = (event.target as HTMLInputElement).files?.[0];
    console.debug('[TracksPage] Fichier sélectionné', this.file?.name);
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
    if (!this.file) return;

    this.service.upload(this.file, this.title.value || this.file.name).subscribe({
      next: (track) => {
        console.debug('[TracksPage] Piste envoyée', track.id);
        this.title.setValue('');
        this.file = undefined;
        this.load(1);
      },
      error: (error) => console.error('[TracksPage] Envoi impossible', error),
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
