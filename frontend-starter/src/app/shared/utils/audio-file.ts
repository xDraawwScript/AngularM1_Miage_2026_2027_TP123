/**
 * Formats audio acceptés : mêmes types MIME que le backend (voir `allowed` dans
 * backend/src/app.js), avec le libellé à afficher pour chacun.
 */
const AUDIO_FORMATS: Record<string, string> = {
  'audio/mpeg': 'MP3',
  'audio/wav': 'WAV',
  'audio/x-wav': 'WAV',
  'audio/ogg': 'OGG',
  'audio/mp4': 'M4A',
  'audio/x-m4a': 'M4A',
};

/** Taille maximale, identique à MAX_FILE_SIZE côté backend (25 Mo). */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Vérifie un fichier avant l'envoi. Retourne le message d'erreur à afficher,
 * ou `null` si le fichier est valide.
 *
 * Cette vérification est un confort pour l'utilisateur (réponse immédiate) :
 * le backend refait les mêmes contrôles, et c'est lui qui fait foi.
 */
export function validateAudioFile(file: File): string | null {
  if (!(file.type in AUDIO_FORMATS)) {
    return 'Format non accepté (MP3, WAV, OGG ou M4A uniquement).';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Fichier trop volumineux (25 Mo maximum).';
  }
  return null;
}

/** "audio/mpeg" → "MP3". Un type inconnu est affiché tel quel. */
export function audioFormatLabel(mimeType: string): string {
  return AUDIO_FORMATS[mimeType] ?? mimeType;
}
