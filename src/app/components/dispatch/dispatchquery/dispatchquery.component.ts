import { Component } from '@angular/core';
import { Dispatch } from '../../../models/dispatch';
import { FormBuilder, FormGroup } from '@angular/forms';
import { StatisticService } from '../../../services/statistic.service';
import { DatetimeInput } from '../../../models/statistic';

@Component({
  selector: 'app-dispatchquery',
  templateUrl: './dispatchquery.component.html',
  styleUrl: './dispatchquery.component.css'
})
export class DispatchqueryComponent {
  dispatchlist: Dispatch[] = [];
  dateForm!: FormGroup;

  constructor(
    private api: StatisticService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.dateForm = this.fb.group({
      startDate: [''],
      endDate: ['']
    });
  }

  loadDispatch() {
    const date: DatetimeInput = {
      StartDate: this.dateForm.value.startDate,
      EndDate: this.dateForm.value.endDate
    };

    this.api.getDispatch(date).subscribe({
      next: data => {
        this.dispatchlist = data;
        console.log("Dispatch listesi geldi:", data);
      },
      error: err => {
        console.error("Dispatch API hata", err);
      }
    });
  }
}
