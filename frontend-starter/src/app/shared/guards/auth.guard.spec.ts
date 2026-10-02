import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => localStorage.clear());

  const run = () =>
    TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  it('laisse passer un utilisateur qui a un token', () => {
    TestBed.inject(AuthService).token.set('jwt-test');
    expect(run()).toBe(true);
  });

  it('redirige vers /login un utilisateur sans token', () => {
    const result = run();

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
  });

  it('redirige aussi après une déconnexion', () => {
    const auth = TestBed.inject(AuthService);
    auth.token.set('jwt-test');
    auth.logout();

    expect(run()).toBeInstanceOf(UrlTree);
  });
});
