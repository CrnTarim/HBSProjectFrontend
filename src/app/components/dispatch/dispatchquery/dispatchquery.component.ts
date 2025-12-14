import { StatisticService } from './../../../services/statistic.service';
import { Component } from '@angular/core';
import { Dispatch, DispatchFilterRequest, DispatchStateSummary, DispatchStateSummaryInput } from '../../../models/dispatch';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DatetimeInput, ForceDto, HospitalDto, RankDto } from '../../../models/statistic';
import { DispatchService } from '../../../services/dispatch.service';

@Component({
  selector: 'app-dispatchquery',
  templateUrl: './dispatchquery.component.html',
  styleUrl: './dispatchquery.component.css'
})
export class DispatchqueryComponent {
  filterModel = new DispatchFilterRequest();   
  dispatchlist: Dispatch[] = [];
  rankList:RankDto []=[];
  hospitalList:HospitalDto []=[];
  forceList :ForceDto []=[];
  dispatchSummaryList:DispatchStateSummary []=[];
  dispatchSummaryInput=new DispatchStateSummaryInput();

  constructor(private dispatchService: DispatchService,private statisticService:StatisticService) {}

   ngOnInit(): void {
     this.loadRanks();
     this.loadForce();
     this.loadHospital();
     
  };
  

  loadDispatch() {
    console.log("Gönderilecek model:", this.filterModel);

    this.dispatchService.getDispatch(this.filterModel).subscribe({
      next: data => {
        this.dispatchlist = data;
        console.log("Gelen dispatch listesi:", data);
      },
      error: err => console.error(err)
    });
  }
  
  loadDispatchSummary() {
    console.log("Gönderilecek model:", this.filterModel);

    this.dispatchService.getDispatchSummary(this.dispatchSummaryInput).subscribe({
      next: data => {
        this.dispatchSummaryList = data;
        console.log("Gelen dispatch listesi:", data);
      },
      error: err => console.error(err)
    });
  }

  loadRanks()
  {
    this.statisticService.getRanks().subscribe({
       next: data => {
        this.rankList = data;
      },
      error: err => console.error(err)
    })
  }

  loadForce()
  {
    this.statisticService.getForces().subscribe({
       next: data => {
        this.forceList = data;
      },
      error: err => console.error(err)
    })
  }

  loadHospital()
  {
    this.statisticService.getHospitals().subscribe({
       next: data => {
        this.hospitalList = data;
        console.log("Gelen hastane listesi:", data);
        
      },
      error: err => console.error(err)
    })
  }
}
