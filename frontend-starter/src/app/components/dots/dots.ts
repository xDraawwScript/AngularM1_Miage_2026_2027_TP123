import { Component } from '@angular/core';

/** Grille de points noirs dont la taille diminue, purement décorative. */
@Component({
  selector: 'app-dots',
  templateUrl: './dots.html',
  styleUrl: './dots.css',
})
export class DotsComponent {
  protected readonly diameters = [28, 22, 16, 10];
  protected readonly columns = [0, 1, 2, 3, 4];
}
