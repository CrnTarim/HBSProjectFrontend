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
  
  selectedDispatches: any[] = [];
  selectedIds = new Set<string>();

    // POPUP
  isPdfPopupVisible = false;
  pdfDispatchIds: string[] = [];


  // popup sonrası gönderim
  pendingSendIds: string[] = [];
  canSend = false;

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



onRowClick(e: any) {
  const id = e.data.dispatchId;

  e.data.selected = !e.data.selected;

  if (e.data.selected) {
    this.selectedIds.add(id);     
  } else {
    this.selectedIds.delete(id);  
  }
}


onSelectionChanged(e: any) {
  this.selectedDispatches = e.selectedRowsData;
  console.log('Seçilen satırlar:', this.selectedDispatches);
}

openPdf() {
    if (this.selectedIds.size === 0) return;

    this.pdfDispatchIds = Array.from(this.selectedIds);
    this.isPdfPopupVisible = true;
  }

  //  popup tamamen bitince burası çalışır
  onPdfFinished(finalIds: string[]) {
    this.selectedIds = new Set(finalIds);

    this.dispatchlist.forEach(d => {
      d.selected = this.selectedIds.has(d.dispatchId);
    });

    this.pendingSendIds = finalIds;
    this.canSend = finalIds.length > 0;

    this.isPdfPopupVisible = false;
  }


saveAndSend() {
  console.log('BACKEND’E GÖNDERİLEN IDLER:', this.pendingSendIds);

  // örnek backend çağrısı
  // this.dispatchService.saveAndSend(this.pendingSendIds).subscribe(() => {

   
    this.selectedIds.clear();

    this.dispatchlist.forEach(d => {
      d.selected = false;
    });

   
    this.pendingSendIds = [];
    this.canSend = false;

  // });
}


}
