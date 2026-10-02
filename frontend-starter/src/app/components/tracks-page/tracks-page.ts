import { Component, computed, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatPaginator, MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Track } from '../../shared/models/track.model';
import { TRACKS_PER_PAGE, TrackService } from '../../shared/services/track.service';
import { TrackCardComponent } from '../track-card/track-card';
import { TridentComponent } from '../trident/trident';
import { TrackUploadComponent } from '../track-upload/track-upload';
import { FrenchPaginatorIntl } from './mat-paginator-intl-fr';

/**
 * Page de la bibliothèque. Elle orchestre trois choses :
 *  - la liste paginée (chargée depuis le serveur, page par page) et son filtre ;
 *  - la lecture audio d'une piste à la fois ;
 *  - la suppression.
 * L'envoi de fichier est dans <app-track-upload>, l'affichage d'une piste dans <app-track-card>.
 */
@Component({
  imports: [ReactiveFormsModule, MatPaginatorModule, TrackUploadComponent, TrackCardComponent, TridentComponent],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.css',
  providers: [{ provide: MatPaginatorIntl, useClass: FrenchPaginatorIntl }],
})
export class TracksPageComponent implements OnDestroy {
  private readonly service = inject(TrackService);
  private readonly snackBar = inject(MatSnackBar);

  // ---- Liste et pagination ------------------------------------------------

  readonly tracks = signal<Track[]>([]);
  /** Page affichée, à partir de 1. */
  readonly page = signal(1);
  readonly pages = signal(1);
  /** Taille de page : la même valeur est envoyée au serveur et donnée au paginateur. */
  readonly pageSize = TRACKS_PER_PAGE;
  /** Nombre total de pistes (toutes pages confondues) : c'est ce dont mat-paginator a besoin. */
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal('');

  /**
   * mat-paginator avance visuellement dès le clic, avant la réponse du serveur.
   * Si la requête échoue, `page` ne change pas et Angular ne lui renvoie donc pas
   * l'ancienne valeur : on la lui remet à la main dans `load()` (cas d'erreur).
   */
  @ViewChild(MatPaginator) private paginator?: MatPaginator;

  // ---- Filtre par titre (côté client, sur la page affichée) ---------------

  readonly filterTitle = new FormControl('', { nonNullable: true });
  private readonly filterValue = toSignal(this.filterTitle.valueChanges, { initialValue: '' });

  readonly filteredTracks = computed(() => {
    const query = this.filterValue().trim().toLowerCase();
    if (!query) return this.tracks();
    return this.tracks().filter((track) => track.title.toLowerCase().includes(query));
  });

  // ---- Lecture audio ------------------------------------------------------

  /** URL locale (blob:...) du morceau chargé en mémoire ; vide tant qu'aucun n'est lu. */
  readonly audioUrl = signal('');
  readonly currentTrackId = signal<string | null>(null);
  readonly currentTitle = signal('');
  readonly isPlaying = signal(false);
  readonly playbackError = signal('');

  /** Permet de faire play()/pause() sans re-télécharger le fichier déjà en mémoire. */
  @ViewChild('audioPlayer') private audioPlayer?: ElementRef<HTMLAudioElement>;

  constructor() {
    this.load();
  }

  ngOnDestroy(): void {
    this.releaseAudio();
  }

  /** Libère le morceau gardé en mémoire (voir `play`) et remet le lecteur à zéro. */
  private releaseAudio(): void {
    const url = this.audioUrl();
    if (url) URL.revokeObjectURL(url);
    this.audioUrl.set('');
    this.currentTrackId.set(null);
    this.currentTitle.set('');
    this.isPlaying.set(false);
  }

  /**
   * Charge une page de pistes depuis le serveur.
   * `page` n'est mis à jour qu'après succès : en cas d'échec, le numéro de page
   * affiché reste cohérent avec les pistes réellement affichées.
   */
  load(targetPage = this.page()): void {
    this.loading.set(true);
    this.error.set('');
    this.service.list(targetPage).subscribe({
      next: (response) => {
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
        if (this.paginator) this.paginator.pageIndex = this.page() - 1;
      },
    });
  }

  /** mat-paginator compte les pages à partir de 0, l'appli à partir de 1. */
  onPageEvent(event: PageEvent): void {
    this.load(event.pageIndex + 1);
  }

  isPlayingTrack(track: Track): boolean {
    return this.currentTrackId() === track.id && this.isPlaying();
  }

  /**
   * Piste déjà chargée : bascule lecture/pause sur le lecteur existant.
   * Autre piste : télécharge son fichier (Blob) via HttpClient, ce qui envoie le JWT
   * (une URL mise directement dans `src` n'aurait pas ce header), puis le joue
   * grâce à une URL locale créée avec URL.createObjectURL.
   */
  play(track: Track): void {
    if (this.currentTrackId() === track.id && this.audioPlayer) {
      const player = this.audioPlayer.nativeElement;
      if (player.paused) void player.play();
      else player.pause();
      return;
    }

    this.currentTrackId.set(track.id);
    this.currentTitle.set(track.title);
    this.playbackError.set('');

    this.service.audio(track.id).subscribe({
      next: (blob) => {
        // On libère l'ancien fichier de la mémoire avant d'en garder un nouveau.
        const previousUrl = this.audioUrl();
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        this.audioUrl.set(URL.createObjectURL(blob));
      },
      error: (error) => {
        console.error('[TracksPage] Lecture impossible', error);
        this.currentTrackId.set(null);
        this.currentTitle.set('');
        this.playbackError.set(`Impossible de charger « ${track.title} » (serveur indisponible ou accès refusé).`);
      },
    });
  }

  // Événements du lecteur : ils gardent `isPlaying` fidèle à l'état réel, y compris
  // quand l'utilisateur met en pause avec les contrôles natifs ou que la piste se termine.
  onAudioPlay(): void {
    this.isPlaying.set(true);
  }

  onAudioPause(): void {
    this.isPlaying.set(false);
  }

  /** Le fichier est arrivé mais le navigateur n'arrive pas à le décoder (fichier corrompu...). */
  onAudioError(): void {
    this.isPlaying.set(false);
    this.playbackError.set(`Le fichier « ${this.currentTitle()} » n'a pas pu être lu par le navigateur.`);
  }

  // ---- Suppression --------------------------------------------------------

  /** Id de la piste en cours de suppression : bloque les doubles clics et grise sa carte. */
  readonly deletingId = signal<string | null>(null);

  /**
   * Supprime une piste après confirmation. L'appel passe par TrackService (jamais par
   * HttpClient directement). Le serveur reste seul juge : il vérifie le JWT et que la
   * piste appartient bien à l'utilisateur, sinon il répond 404.
   */
  remove(track: Track): void {
    if (this.deletingId()) return; // une suppression est déjà en cours
    if (!confirm(`Supprimer « ${track.title} » ?`)) return;

    this.deletingId.set(track.id);
    this.service.remove(track.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        // La piste supprimée ne doit pas continuer à jouer.
        if (this.currentTrackId() === track.id) this.releaseAudio();
        this.notify(`« ${track.title} » a été supprimée.`);
        // Si c'était la seule piste de la page, on recule d'une page (sinon page vide).
        const wasLastOfPage = this.tracks().length === 1 && this.page() > 1;
        this.load(wasLastOfPage ? this.page() - 1 : this.page());
      },
      error: (error: HttpErrorResponse) => {
        console.error('[TracksPage] Suppression impossible', error.status);
        this.deletingId.set(null);
        if (error.status === 404) {
          // Déjà supprimée (autre onglet) ou pas à nous : la liste affichée est périmée.
          this.notify("Cette piste n'existe plus ou ne vous appartient pas.");
          this.load();
        } else if (error.status === 500) {
          // Le serveur a supprimé la piste en base mais pas le fichier : on rafraîchit.
          this.notify(error.error?.message ?? 'Erreur serveur pendant la suppression.');
          this.load();
        } else {
          this.notify('Suppression impossible, réessayez.');
        }
      },
    });
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 4000, panelClass: 'ds-snack' });
  }
}
