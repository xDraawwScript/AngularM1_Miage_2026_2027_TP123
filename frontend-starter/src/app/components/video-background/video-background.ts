import { Component } from '@angular/core';

/**
 * Fond vidéo décoratif : le lecteur officiel YouTube (la vidéo reste hébergée chez YouTube),
 * muet (sinon les navigateurs bloquent la lecture automatique), en boucle, sans contrôles
 * et non cliquable. Le parent décide de l'afficher ou non.
 */
@Component({
  selector: 'app-video-background',
  templateUrl: './video-background.html',
  styleUrl: './video-background.css',
})
export class VideoBackgroundComponent {}
