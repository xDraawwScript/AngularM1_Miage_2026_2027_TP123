import { audioFormatLabel, validateAudioFile } from './audio-file';

describe('validateAudioFile', () => {
  it('accepte un mp3 de taille raisonnable', () => {
    const file = new File(['x'], 'riff.mp3', { type: 'audio/mpeg' });
    expect(validateAudioFile(file)).toBeNull();
  });

  it('refuse un format non audio avec un message explicite', () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    expect(validateAudioFile(file)).toContain('Format non accepté');
  });

  it('refuse un fichier de plus de 25 Mo', () => {
    const file = new File(['x'], 'long.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(file, 'size', { value: 26 * 1024 * 1024 });
    expect(validateAudioFile(file)).toContain('25 Mo');
  });

  it('accepte exactement 25 Mo (limite incluse, comme le backend)', () => {
    const file = new File(['x'], 'limite.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(file, 'size', { value: 25 * 1024 * 1024 });
    expect(validateAudioFile(file)).toBeNull();
  });
});

describe('audioFormatLabel', () => {
  it('traduit un type MIME connu en libellé court', () => {
    expect(audioFormatLabel('audio/mpeg')).toBe('MP3');
    expect(audioFormatLabel('audio/x-m4a')).toBe('M4A');
  });

  it('affiche tel quel un type inconnu', () => {
    expect(audioFormatLabel('audio/flac')).toBe('audio/flac');
  });
});
