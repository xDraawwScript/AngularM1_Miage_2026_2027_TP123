import { Component, input, output } from '@angular/core';
import { Track } from '../../shared/models/track.model';
import { audioFormatLabel } from '../../shared/utils/audio-file';
import { formatDate, formatSize } from '../../shared/utils/track-format';

/**
 * Carte d'un morceau. Composant purement visuel : il affiche la piste reçue et
 * signale les clics, sans jamais appeler l'API lui-même (c'est le rôle de la page).
 */
@Component({
  selector: 'app-track-card',
  templateUrl: './track-card.html',
  styleUrl: './track-card.css',
})
export class TrackCardComponent {
  readonly track = input.required<Track>();
  /** Vrai quand CETTE piste est en cours de lecture : le bouton devient « Pause ». */
  readonly playing = input(false);
  /** Vrai pendant la suppression de CETTE piste : la carte est grisée et ses boutons bloqués. */
  readonly deleting = input(false);

  readonly playRequested = output<Track>();
  readonly removeRequested = output<Track>();

  // Exposés au template.
  protected readonly audioFormatLabel = audioFormatLabel;
  protected readonly formatSize = formatSize;
  protected readonly formatDate = formatDate;
}
