import { Component, computed, inject, output, signal } from '@angular/core';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackService } from '../../shared/services/track.service';
import { validateAudioFile } from '../../shared/utils/audio-file';

/** Les quatre états possibles de l'envoi : un seul à la fois, donc jamais d'incohérence. */
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

/** Formulaire d'envoi d'un fichier audio : choix, validation, progression, résultat. */
@Component({
  selector: 'app-track-upload',
  imports: [ReactiveFormsModule],
  templateUrl: './track-upload.html',
  styleUrl: './track-upload.css',
})
export class TrackUploadComponent {
  private readonly service = inject(TrackService);

  /** Émis après un envoi réussi : la page parente recharge sa liste. */
  readonly uploaded = output<void>();

  readonly title = new FormControl('', { nonNullable: true });
  readonly file = signal<File | null>(null);

  readonly status = signal<UploadStatus>('idle');
  readonly uploading = computed(() => this.status() === 'uploading');
  /** Pourcentage d'envoi (0 à 100), ou null si le navigateur ne connaît pas la taille totale. */
  readonly progress = signal<number | null>(0);
  readonly error = signal('');
  readonly success = signal('');

  /** Gardé pour pouvoir vider l'affichage natif du champ fichier (voir `reset`). */
  private fileInput?: HTMLInputElement;

  choose(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0];
    this.fileInput = input;
    this.error.set('');
    this.status.set('idle');
    this.file.set(null);

    if (!selected) return;

    const problem = validateAudioFile(selected);
    if (problem) {
      this.error.set(problem);
      this.status.set('error');
      input.value = '';
      return;
    }

    this.file.set(selected);
  }

  upload(): void {
    const file = this.file();
    if (!file || this.uploading()) return; // pas de double envoi

    this.status.set('uploading');
    this.progress.set(0);
    this.error.set('');
    this.success.set('');
    // Pendant l'envoi, on ne peut plus modifier le titre (le champ fichier est
    // désactivé dans le template). `title.value` reste lisible même désactivé.
    this.title.disable();

    // Contrairement à un POST classique (une seule valeur : la réponse), cet
    // Observable émet plusieurs événements : on les distingue grâce à `event.type`.
    this.service.upload(file, this.title.value || file.name).subscribe({
      next: (event) => {
        switch (event.type) {
          case HttpEventType.Sent:
            this.progress.set(0);
            break;
          case HttpEventType.UploadProgress:
            // `total` peut manquer : on affiche alors une barre indéterminée.
            this.progress.set(event.total ? Math.round((100 * event.loaded) / event.total) : null);
            break;
          case HttpEventType.Response:
            this.onSuccess(event.body?.title ?? file.name);
            break;
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('[TrackUpload] Envoi impossible', error.status);
        this.status.set('error');
        this.progress.set(0);
        this.title.enable();
        this.error.set(error.error?.message ?? "Échec de l'envoi, réessayez.");
      },
    });
  }

  private onSuccess(title: string): void {
    this.status.set('success');
    this.progress.set(100);
    this.success.set(`« ${title} » a bien été envoyée.`);
    setTimeout(() => {
      if (this.status() === 'success') this.status.set('idle');
      this.success.set('');
    }, 4000);
    this.reset();
    this.uploaded.emit();
  }

  /**
   * Vide le formulaire. Le champ fichier natif ne peut pas être vidé par
   * data-binding (restriction des navigateurs) : il faut toucher son `value`.
   */
  private reset(): void {
    this.title.enable();
    this.title.setValue('');
    this.file.set(null);
    if (this.fileInput) this.fileInput.value = '';
  }
}
