import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;
  const router = { navigateByUrl: vi.fn() };

  beforeEach(() => {
    localStorage.clear();
    router.navigateByUrl.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('ajoute Authorization: Bearer <token> quand un token existe', () => {
    auth.token.set('jwt-test');
    client.get('/api/tracks').subscribe();

    const req = http.expectOne('/api/tracks');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-test');
    req.flush({});
  });

  it('n’ajoute aucun en-tête Authorization sans token', () => {
    client.get('/api/tracks').subscribe();

    const req = http.expectOne('/api/tracks');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('sur une réponse 401 : déconnecte, redirige vers /login et propage l’erreur', () => {
    auth.token.set('jwt-expire');
    localStorage.setItem('gpc_token', 'jwt-expire');
    let status = 0;
    client.get('/api/tracks').subscribe({ error: (e) => (status = e.status) });

    http
      .expectOne('/api/tracks')
      .flush({ message: 'Jeton invalide ou expiré' }, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(auth.token()).toBeNull();
    expect(localStorage.getItem('gpc_token')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('ne déconnecte pas sur une autre erreur (404)', () => {
    auth.token.set('jwt-test');
    client.get('/api/tracks/x').subscribe({ error: () => undefined });

    http.expectOne('/api/tracks/x').flush({ message: 'Piste inconnue' }, { status: 404, statusText: 'Not Found' });

    expect(auth.token()).toBe('jwt-test');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
