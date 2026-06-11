import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { SolicitudService } from './solicitud-service';

describe('SolicitudService', () => {
  let service: SolicitudService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(SolicitudService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
