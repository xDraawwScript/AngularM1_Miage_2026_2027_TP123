import { Component, inject, output, signal } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackService } from '../../shared/services/track.service';
import { validateAudioFile } from '../../shared/utils/audio-file';

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
  readonly uploading = signal(false);
  /** Pourcentage d'envoi, de 0 à 100. */
  readonly progress = signal(0);
  readonly error = signal('');
  readonly success = signal('');

  /** Gardé pour pouvoir vider l'affichage natif du champ fichier (voir `reset`). */
  private fileInput?: HTMLInputElement;

  choose(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0];
    this.fileInput = input;
    this.error.set('');
    this.file.set(null);

    if (!selected) return;

    const problem = validateAudioFile(selected);
    if (problem) {
      this.error.set(problem);
      input.value = '';
      return;
    }

    this.file.set(selected);
  }

  upload(): void {
    const file = this.file();
    if (!file || this.uploading()) return; // pas de double envoi

    this.uploading.set(true);
    this.progress.set(0);
    this.error.set('');
    this.success.set('');

    this.service.upload(file, this.title.value || file.name).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress.set(Math.round((100 * event.loaded) / event.total));
        } else if (event.type === HttpEventType.Response) {
          this.onSuccess(event.body?.title ?? file.name);
        }
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TrackUpload] Envoi impossible', error);
        this.uploading.set(false);
        this.error.set(error.error?.message ?? "Échec de l'envoi, réessayez.");
      },
    });
  }

  private onSuccess(title: string): void {
    this.uploading.set(false);
    this.success.set(`« ${title} » a bien été envoyée.`);
    setTimeout(() => this.success.set(''), 4000);
    this.reset();
    this.uploaded.emit();
  }

  /**
   * Vide le formulaire. Le champ fichier natif ne peut pas être vidé par
   * data-binding (restriction des navigateurs) : il faut toucher son `value`.
   */
  private reset(): void {
    this.title.setValue('');
    this.file.set(null);
    if (this.fileInput) this.fileInput.value = '';
  }
}
