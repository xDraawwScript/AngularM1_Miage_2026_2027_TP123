import { Component, signal } from '@angular/core';

/**
 * Le trident décoratif des pages.
 *
 * Si une illustration perso est déposée dans `public/trident.png`, elle est affichée.
 * Sinon (fichier absent), on retombe sur un trident dessiné en SVG.
 * Dans les deux cas c'est purement décoratif : aucun texte alternatif nécessaire.
 */
@Component({
  selector: 'app-trident',
  templateUrl: './trident.html',
  styleUrl: './trident.css',
})
export class TridentComponent {
  protected readonly useImage = signal(true);
}
