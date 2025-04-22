import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { AdminGuard } from './admin.guard';

describe('adminGuard', () => {
  let adminGuard: AdminGuard;
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => adminGuard.canActivate(...guardParameters));
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminGuard]
    });
    adminGuard = TestBed.inject(AdminGuard);
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
