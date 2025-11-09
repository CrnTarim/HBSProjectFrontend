import { TestBed } from '@angular/core/testing';

import { HosdefinitionService } from './hosdefinition.service';

describe('HosdefinitionService', () => {
  let service: HosdefinitionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HosdefinitionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
