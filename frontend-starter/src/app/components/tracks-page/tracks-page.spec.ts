import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Page } from '../../shared/models/page.model';
import { Track } from '../../shared/models/track.model';
import { TracksPageComponent } from './tracks-page';

/** Fabrique une piste de test. */
const track = (id: string, title = `Piste ${id}`): Track => ({
  id,
  title,
  originalName: `${id}.mp3`,
  mimeType: 'audio/mpeg',
  size: 1000,
  createdAt: '2026-09-24T10:00:00Z',
});

const page = (items: Track[], pageNumber = 1, total = items.length): Page<Track> => ({
  items,
  page: pageNumber,
  limit: 5,
  total,
  pages: Math.max(1, Math.ceil(total / 5)),
});

describe('TracksPageComponent — liste et suppression', () => {
  let fixture: ComponentFixture<TracksPageComponent>;
  let component: TracksPageComponent;
  let http: HttpTestingController;
  const snackBar = { open: vi.fn() };

  /** Requêtes GET /api/tracks d'une page donnée. */
  const listRequest = (pageNumber: number): TestRequest =>
    http.expectOne((r) => r.url === '/api/tracks' && r.params.get('page') === String(pageNumber));

  /** Crée la page et répond à la première requête de liste. */
  function start(items: Track[], pageNumber = 1, total = items.length): void {
    fixture = TestBed.createComponent(TracksPageComponent);
    component = fixture.componentInstance;
    listRequest(1).flush(page(items, 1, total));
    if (pageNumber !== 1) {
      component.load(pageNumber);
      listRequest(pageNumber).flush(page(items, pageNumber, total));
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    snackBar.open.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatSnackBar, useValue: snackBar }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('charge la première page au démarrage (GET /api/tracks?page=1&limit=5) et l’affiche', () => {
    start([track('a'), track('b')]);

    expect(component.tracks().map((t) => t.id)).toEqual(['a', 'b']);
    expect(fixture.nativeElement.querySelectorAll('app-track-card').length).toBe(2);
  });

  it('affiche un message d’erreur après un échec HTTP au chargement', () => {
    fixture = TestBed.createComponent(TracksPageComponent);
    component = fixture.componentInstance;
    listRequest(1).flush({ message: 'Base indisponible' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.error()).toBe('Base indisponible');
    expect(fixture.nativeElement.querySelector('.error')?.textContent).toContain('Base indisponible');
  });

  describe('suppression', () => {
    beforeEach(() => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('confirmée : envoie DELETE /api/tracks/:id puis recharge la liste et notifie', () => {
      start([track('a', 'Blues'), track('b')]);

      component.remove(track('a', 'Blues'));
      const del = http.expectOne('/api/tracks/a');
      expect(del.request.method).toBe('DELETE');
      expect(component.deletingId()).toBe('a');

      del.flush(null, { status: 204, statusText: 'No Content' });
      listRequest(1).flush(page([track('b')]));

      expect(component.deletingId()).toBeNull();
      expect(component.tracks().map((t) => t.id)).toEqual(['b']);
      expect(snackBar.open).toHaveBeenCalledOnce();
      expect(snackBar.open.mock.calls[0][0]).toContain('Blues');
    });

    it('refusée dans la boîte de confirmation : aucune requête DELETE', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      start([track('a')]);

      component.remove(track('a'));

      http.expectNone('/api/tracks/a');
      expect(component.deletingId()).toBeNull();
      expect(snackBar.open).not.toHaveBeenCalled();
    });

    it('double clic : un seul DELETE tant que le premier n’est pas terminé', () => {
      start([track('a')]);

      component.remove(track('a'));
      component.remove(track('a'));

      expect(http.match('/api/tracks/a').length).toBe(1);
    });

    it('404 (piste déjà supprimée ou à un autre) : message dédié et liste rafraîchie', () => {
      start([track('a'), track('b')]);

      component.remove(track('a'));
      http.expectOne('/api/tracks/a').flush({ message: 'Piste inconnue' }, { status: 404, statusText: 'Not Found' });
      listRequest(1).flush(page([track('b')]));

      expect(snackBar.open.mock.calls[0][0]).toContain("n'existe plus");
      expect(component.deletingId()).toBeNull();
      expect(component.tracks().map((t) => t.id)).toEqual(['b']);
    });

    it('erreur réseau : message d’échec, pas de rechargement, bouton de nouveau utilisable', () => {
      start([track('a')]);

      component.remove(track('a'));
      http.expectOne('/api/tracks/a').error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

      expect(snackBar.open.mock.calls[0][0]).toContain('Suppression impossible');
      expect(component.deletingId()).toBeNull();
      http.expectNone((r) => r.url === '/api/tracks'); // aucun rechargement inutile
    });

    it('dernière piste d’une page > 1 : recharge la page précédente (pas de page vide)', () => {
      start([track('z')], 2, 6);

      component.remove(track('z'));
      http.expectOne('/api/tracks/z').flush(null, { status: 204, statusText: 'No Content' });

      listRequest(1).flush(page([track('a'), track('b')], 1, 5));
      expect(component.page()).toBe(1);
    });

    it('piste en cours de lecture : la lecture est arrêtée et l’URL locale révoquée', () => {
      const revoke = vi.fn();
      Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, configurable: true, writable: true });
      start([track('a')]);
      component.audioUrl.set('blob:http://localhost/xyz');
      component.currentTrackId.set('a');
      component.currentTitle.set('Piste a');

      component.remove(track('a'));
      http.expectOne('/api/tracks/a').flush(null, { status: 204, statusText: 'No Content' });
      listRequest(1).flush(page([]));

      expect(revoke).toHaveBeenCalledWith('blob:http://localhost/xyz');
      expect(component.audioUrl()).toBe('');
      expect(component.currentTrackId()).toBeNull();
    });
  });
});
