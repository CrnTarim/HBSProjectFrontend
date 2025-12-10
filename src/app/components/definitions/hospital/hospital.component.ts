import { Component, ViewChild } from '@angular/core';
import { HosdefinitionService } from '../../../services/hosdefinition.service';
import { City, CreateHospital, Hospital, HospitalCodeName } from '../../../models/definition';
import { DxDataGridComponent,DxTabPanelModule } from 'devextreme-angular';
import DataSource from "devextreme/data/data_source";

@Component({
  selector: 'app-hospital',
  templateUrl:'./hospital.component.html',
  styleUrl: './hospital.component.css'
})
export class HospitalComponent {

  hospitals: Hospital[] = [];
  hospitalcodename: HospitalCodeName[] = [];
  isLoading = true;
  selectedHospital: Hospital | null = null;
  savemodeHospital = false;
  popupVisible = false;

  searchText: string = '';
  city: City[] = [];

  viewModel = new CreateHospital();

  dataSource: any;

  @ViewChild('hospitalGrid', { static: false }) hospitalGrid!: DxDataGridComponent;
  @ViewChild('tabPanel', { static: false }) tabPanel: any;

  constructor(private defService: HosdefinitionService) {}

  ngOnInit(): void {
    this.gethospitaldef();
    this.gethospitalcodenames();

    this.dataSource = new DataSource({
      load: (loadOptions: any) =>
        this.defService.loadHospitals(loadOptions).toPromise()
    });
  }

  gethospitaldef() {
    this.defService.getHospitals().subscribe({
      next: (data) => {
        this.hospitals = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  gethospitalcodenames() {
    this.defService.getHospitalCodeName().subscribe({
      next: (data) => this.hospitalcodename = data,
      error: (err) => console.error(err)
    })
  }

  newHospital() {
    this.savemodeHospital = true;
    this.selectedHospital = null;

    this.viewModel = new CreateHospital();

    this.clearGridSearch();
  }

  deleteRank() {
    if (!this.selectedHospital) return;

    this.defService.deleteHospital(this.selectedHospital.id!).subscribe({
      next: () => {
        this.gethospitaldef();
        this.newHospital();
      },
      error: (err) => console.error(err)
    });
  }

  onSearchChange() {
    this.hospitalGrid?.instance.searchByText(this.searchText || '');
  }

  clearGridSearch() {
    this.searchText = '';
    this.hospitalGrid?.instance.searchByText('');
    this.hospitalGrid?.instance.clearFilter();
  }

  openConfirm() {
    if (!this.viewModel.code || !this.viewModel.name || !this.viewModel.citycode) {
      alert("Lütfen gerekli alanları doldurun.");
      return;
    }

    this.popupVisible = true;
  }

  saveHospital() {
    this.popupVisible = false;

    if (!this.selectedHospital) {
      this.defService.postHospital(this.viewModel).subscribe({
        next: () => {
          this.gethospitaldef();
          this.newHospital();
        },
        error: (err) => console.error(err)
      });
    } else {
      const updated = {
        id: this.selectedHospital.id,
        code: this.viewModel.code,
        name: this.viewModel.name,
        citycode: this.viewModel.citycode
      };
    }
  }

  gethospitalcities(id: number) {
    this.defService.getHospitalselectedcity(id).subscribe({
      next: (data) => this.city = data,
      error: (err) => console.error(err)
    });
  }

selectedIndex = 0;

onRowSelect(h: Hospital) {
  this.selectedHospital = h;

  if (h.code && h.name && h.cityCode) {
    this.viewModel = {
      code: h.code,
      name: h.name,
      citycode: h.cityCode
    };
    this.gethospitalcities(h.code);
  }

  this.selectedIndex = 1;
}


  onDetailClick = (e: any) => {
    if (e.row?.data) {
      this.selectedRow = e.row.data;
      this.detailPopupVisible = true;
    }
  };

  onCellPrepared(e: any) {
    if (e.value != null) {
      e.cellElement.title = e.value.toString();
    }
  }
  detailPopupVisible = false;
  selectedRow: Hospital | null = null;


}
