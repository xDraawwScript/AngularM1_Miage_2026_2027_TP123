import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { TridentComponent } from '../trident/trident';

@Component({
  imports: [ReactiveFormsModule, TridentComponent],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePageComponent {
  readonly auth = inject(AuthService);
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal('');

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.auth.profile().subscribe({
      next: (user) => {
        console.debug('[ProfilePage] Profil chargé', user.id);
        this.form.setValue({ name: user.name });
        this.loading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[ProfilePage] Chargement impossible', error);
        this.error.set(error.error?.message ?? 'Impossible de charger le profil');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.saved.set(false);
    this.error.set('');
    this.auth.update(this.form.getRawValue().name).subscribe({
      next: (user) => {
        console.debug('[ProfilePage] Profil enregistré', user.id);
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2000);
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[ProfilePage] Enregistrement impossible', error);
        this.error.set(error.error?.message ?? "Impossible d'enregistrer le nom");
        this.saving.set(false);
      },
    });
  }
}
