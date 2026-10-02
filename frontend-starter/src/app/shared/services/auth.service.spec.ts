import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

const user = { id: 'u1', name: 'Demo', email: 'demo@example.com', createdAt: '2026-09-17T10:00:00Z' };

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify(); // aucune requête inattendue ne doit rester
    localStorage.clear();
  });

  it('login() envoie POST /api/auth/login avec email et mot de passe dans le corps', () => {
    service.login('demo@example.com', 'Demo1234!').subscribe();

    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'demo@example.com', password: 'Demo1234!' });
    req.flush({ token: 'jwt-test', user });
  });

  it('login() mémorise le token (signal et localStorage) et l’utilisateur', () => {
    service.login('demo@example.com', 'Demo1234!').subscribe();
    http.expectOne('/api/auth/login').flush({ token: 'jwt-test', user });

    expect(service.token()).toBe('jwt-test');
    expect(localStorage.getItem('gpc_token')).toBe('jwt-test');
    expect(service.currentUser()?.email).toBe('demo@example.com');
  });

  it('login() ne mémorise rien quand le serveur répond 401', () => {
    let status = 0;
    service.login('demo@example.com', 'mauvais').subscribe({ error: (e) => (status = e.status) });
    http
      .expectOne('/api/auth/login')
      .flush({ message: 'Identifiants incorrects' }, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(service.token()).toBeNull();
    expect(localStorage.getItem('gpc_token')).toBeNull();
  });

  it('register() envoie POST /api/auth/register avec nom, email et mot de passe', () => {
    service.register('Demo', 'demo@example.com', 'Demo1234!').subscribe();

    const req = http.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Demo', email: 'demo@example.com', password: 'Demo1234!' });
    req.flush({ token: 'jwt-test', user });
  });

  it('profile() lit GET /api/users/me et met à jour l’utilisateur courant', () => {
    service.profile().subscribe();
    const req = http.expectOne('/api/users/me');
    expect(req.request.method).toBe('GET');
    req.flush(user);

    expect(service.currentUser()?.name).toBe('Demo');
  });

  it('logout() efface le token, le localStorage et l’utilisateur', () => {
    service.login('demo@example.com', 'Demo1234!').subscribe();
    http.expectOne('/api/auth/login').flush({ token: 'jwt-test', user });

    service.logout();

    expect(service.token()).toBeNull();
    expect(localStorage.getItem('gpc_token')).toBeNull();
    expect(service.currentUser()).toBeNull();
  });
});
