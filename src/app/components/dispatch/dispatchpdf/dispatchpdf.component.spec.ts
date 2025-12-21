import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DispatchpdfComponent } from './dispatchpdf.component';

describe('DispatchpdfComponent', () => {
  let component: DispatchpdfComponent;
  let fixture: ComponentFixture<DispatchpdfComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DispatchpdfComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DispatchpdfComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
