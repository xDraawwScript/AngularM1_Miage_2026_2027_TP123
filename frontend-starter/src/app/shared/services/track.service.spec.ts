import { TestBed } from '@angular/core/testing';
import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TRACKS_PER_PAGE, TrackService } from './track.service';

describe('TrackService', () => {
  let service: TrackService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TrackService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list() transmet page et limit en paramètres de GET /api/tracks', () => {
    service.list(2, 5).subscribe();

    const req = http.expectOne((r) => r.url === '/api/tracks');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('5');
    req.flush({ items: [], page: 2, limit: 5, total: 0, pages: 1 });
  });

  it('list() utilise page 1 et 6 pistes par page par défaut', () => {
    service.list().subscribe();

    const req = http.expectOne((r) => r.url === '/api/tracks');
    expect(TRACKS_PER_PAGE).toBe(6);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('6');
    req.flush({ items: [], page: 1, limit: 6, total: 0, pages: 1 });
  });

  it('remove() envoie DELETE /api/tracks/:id', () => {
    let done = false;
    service.remove('abc123').subscribe(() => (done = true));

    const req = http.expectOne('/api/tracks/abc123');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBe(true);
  });

  it('upload() poste un FormData avec les champs audio et title, en suivant la progression', () => {
    const file = new File(['x'], 'riff.mp3', { type: 'audio/mpeg' });
    const events: HttpEventType[] = [];
    service.upload(file, 'Mon riff').subscribe((event) => events.push(event.type));

    const req = http.expectOne('/api/tracks');
    expect(req.request.method).toBe('POST');
    expect(req.request.reportUploadProgress).toBe(true);
    const body = req.request.body as FormData;
    expect((body.get('audio') as File).name).toBe('riff.mp3');
    expect(body.get('title')).toBe('Mon riff');

    // Plusieurs événements, pas une seule valeur : c'est ce qui permet d'afficher un pourcentage.
    req.event({ type: HttpEventType.UploadProgress, loaded: 1, total: 2 });
    req.flush({ id: 't1', title: 'Mon riff' });
    expect(events).toContain(HttpEventType.UploadProgress);
    expect(events).toContain(HttpEventType.Response);
  });

  it('audio() télécharge GET /api/tracks/:id/audio en blob', () => {
    service.audio('abc123').subscribe();

    const req = http.expectOne('/api/tracks/abc123/audio');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']));
  });
});
