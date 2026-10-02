import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TrackUploadComponent } from './track-upload';

/** Simule le choix d'un fichier dans <input type="file">. */
function choose(component: TrackUploadComponent, file: File): void {
  const input = document.createElement('input');
  Object.defineProperty(input, 'files', { value: [file] });
  component.choose({ target: input } as unknown as Event);
}

describe('TrackUploadComponent — états et progression', () => {
  let fixture: ComponentFixture<TrackUploadComponent>;
  let component: TrackUploadComponent;
  let http: HttpTestingController;
  const mp3 = () => new File(['x'], 'riff.mp3', { type: 'audio/mpeg' });

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(TrackUploadComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('état initial : idle, aucun envoi possible sans fichier', () => {
    expect(component.status()).toBe('idle');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
  });

  it('refuse un fichier non audio : état error, message, aucun fichier retenu', () => {
    choose(component, new File(['x'], 'notes.txt', { type: 'text/plain' }));

    expect(component.status()).toBe('error');
    expect(component.error()).toContain('Format non accepté');
    expect(component.file()).toBeNull();
  });

  it('upload() calcule le pourcentage à partir de loaded / total', () => {
    choose(component, mp3());
    component.upload();
    const req = http.expectOne('/api/tracks');

    req.event({ type: HttpEventType.Sent });
    expect(component.progress()).toBe(0);
    req.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 200 });
    expect(component.progress()).toBe(25);
    req.event({ type: HttpEventType.UploadProgress, loaded: 199, total: 200 });
    expect(component.progress()).toBe(100); // 99,5 arrondi
    expect(component.status()).toBe('uploading');

    req.flush({ id: 't1', title: 'riff.mp3' });
  });

  it('progression indéterminée (null) quand la taille totale est inconnue', () => {
    choose(component, mp3());
    component.upload();
    http.expectOne('/api/tracks').event({ type: HttpEventType.UploadProgress, loaded: 10 });

    expect(component.progress()).toBeNull();
    http.match('/api/tracks').forEach((r) => r.flush({ id: 't1', title: 'x' }));
  });

  it('pendant l’envoi : titre et bouton désactivés, seconde soumission ignorée', () => {
    choose(component, mp3());
    component.upload();
    fixture.detectChanges();

    expect(component.uploading()).toBe(true);
    expect(component.title.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('input[type=file]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);

    component.upload(); // double clic
    expect(http.match('/api/tracks').length).toBe(1); // une seule requête partie

    http.match('/api/tracks').forEach((r) => r.flush({ id: 't1', title: 'x' }));
  });

  it('réussite : état success, 100 %, formulaire vidé, événement uploaded émis', () => {
    const uploaded = vi.fn();
    component.uploaded.subscribe(uploaded);
    component.title.setValue('Mon riff');
    choose(component, mp3());

    component.upload();
    const req = http.expectOne('/api/tracks');
    expect((req.request.body as FormData).get('title')).toBe('Mon riff');
    req.flush({ id: 't1', title: 'Mon riff' });

    expect(component.status()).toBe('success');
    expect(component.progress()).toBe(100);
    expect(component.success()).toContain('Mon riff');
    expect(component.title.value).toBe('');
    expect(component.title.enabled).toBe(true);
    expect(component.file()).toBeNull();
    expect(uploaded).toHaveBeenCalledOnce();
  });

  it('le message de succès disparaît et l’état repasse à idle après 4 s', () => {
    vi.useFakeTimers();
    choose(component, mp3());
    component.upload();
    http.expectOne('/api/tracks').flush({ id: 't1', title: 'riff.mp3' });
    expect(component.status()).toBe('success');

    vi.advanceTimersByTime(4000);

    expect(component.status()).toBe('idle');
    expect(component.success()).toBe('');
  });

  it('échec HTTP : état error, message du serveur, progression à 0, contrôles réactivés', () => {
    const uploaded = vi.fn();
    component.uploaded.subscribe(uploaded);
    choose(component, mp3());
    component.upload();

    http
      .expectOne('/api/tracks')
      .flush({ message: 'Fichier audio requis' }, { status: 400, statusText: 'Bad Request' });

    expect(component.status()).toBe('error');
    expect(component.error()).toBe('Fichier audio requis');
    expect(component.progress()).toBe(0);
    expect(component.title.enabled).toBe(true);
    expect(component.file()).not.toBeNull(); // on peut réessayer sans re-choisir
    expect(uploaded).not.toHaveBeenCalled();
  });
});
