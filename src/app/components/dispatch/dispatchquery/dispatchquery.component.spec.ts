import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DispatchqueryComponent } from './dispatchquery.component';

describe('DispatchqueryComponent', () => {
  let component: DispatchqueryComponent;
  let fixture: ComponentFixture<DispatchqueryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DispatchqueryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DispatchqueryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
