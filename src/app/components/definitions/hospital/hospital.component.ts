import { Component, ViewChild } from '@angular/core';
import { HosdefinitionService } from '../../../services/hosdefinition.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Hospital, HospitalCodeName } from '../../../models/definition';
import { DxDataGridComponent,DxFormModule} from 'devextreme-angular';
import DataSource from "devextreme/data/data_source";


@Component({
  selector: 'app-hospital',
  templateUrl:'./hospital.component.html',
  styleUrl: './hospital.component.css'
})
export class HospitalComponent {

  hospitals: Hospital[] = [];
  hospitalcodename:HospitalCodeName[]=[];
  isLoading = true;
  selectedHospital: Hospital| null = null;
  savemodeHospital=false;
  popupVisible = false;
  hospitalForm!: FormGroup; 
  searchText: string = '';
  citycodes: number[] = []; 
  dataSource: any;
  

@ViewChild('hospitalGrid', { static: false }) hospitalGrid!: DxDataGridComponent;  
constructor(
    private defService: HosdefinitionService,
    private formBuilder: FormBuilder
  ) {}
 
  ngOnInit(): void {
    //  reactive form
    this.initForm();
    this.gethospitaldef();
    this.gethospitalcities();
    this.gethospitalcodenames();
    this.dataSource = new DataSource({
    load: (loadOptions: any) => {
                                  return this.defService.loadHospitals(loadOptions).toPromise();
                                }
});

  }
private initForm(): void {
  this.hospitalForm = this.formBuilder.group({
    id: [null],
    code: [null, Validators.required],
    name: ['', Validators.required],
    cityCode: [null, Validators.required]
  });
}
  //  Grid verisi getir
  gethospitaldef() {
    this.defService.getHospitals().subscribe({
      next:(data)=>{
        this.hospitals = data;
        this.isLoading=false;
      },
      error: (err) => {
        console.error('Rank verisi alınamadı', err);
        this.isLoading = false;
       }
    });
  }

  gethospitalcities()
  {
    this.defService.getHospitalCityCodes().subscribe({
     next:(data)=>{
        this.citycodes = data;
       
      },
      error: (err) => {
        console.error('Rank verisi alınamadı', err);
        this.isLoading = false;
       }
    })
    console.log( this.citycodes);
  }

  gethospitalcodenames()
  {
    this.defService.getHospitalCodeName().subscribe({
      next:(data)=>{
        this.hospitalcodename=data;},
        error: (err) => {
          console.error('Rank verisi alınamadı', err);
          this.isLoading = false;
         }
    })
  }
  //  Gridde satıra seç
  // onRowSelect(hospital:Hospital)
  // {
  //   this.selectedHospital=hospital;// seçimi tut
  //   this.hospitalForm.patchValue(hospital);//seçimi forma ayzdır
  // }


//Form temizle
   newHospital() {
    this.savemodeHospital=true;
    this.selectedHospital = null;
    this.hospitalForm.reset();
    this.clearGridSearch();
  }

  //Hastane sil
  deleteRank() {
    if (!this.selectedHospital|| !this.selectedHospital.id) {
      alert('Lütfen önce listeden bir kayıt seçin.');
      return;
    }
  const id = this.selectedHospital.id;
  this.isLoading = true;

  this.defService.deleteHospital(id).subscribe({
    next: (msg:string) => {
      console.log(msg);    
      this.gethospitaldef();
      this.selectedHospital = null;
      this.hospitalForm.reset();
      this.isLoading = false;
    },
    error: (err:string) => {
      console.error('Silme sırasında hata oluştu', err);
      this.isLoading = false;
    }
  });
}

  // Kayıt arama
   onSearchChange() {
    if (!this.hospitalGrid) return;
    this.hospitalGrid.instance.searchByText(this.searchText || '');
  }

  // Kayıt arama alanı temizle
  clearGridSearch() {
    this.searchText = '';
    if (!this.hospitalGrid) return;  
    this.hospitalGrid.instance.searchByText('');
    this.hospitalGrid.instance.clearFilter();
  }

  //Kaydet butonu popup
  openConfirm() {
    if(this.selectedHospital || this.savemodeHospital)
    {
      if (this.hospitalForm.invalid) {
            alert('Lütfen gerekli alanları doldurun.');
            return;
          }
          this.popupVisible = true;
    } 
    else
    {
      alert('Lütfen gerekli metot tipini seçin doldurun.');
            return;
    }
  }

  //  Kaydet onay
  saveHospital() {
    this.popupVisible = false; //kaydete basınca popupı kapat
    const hospitalData = this.hospitalForm.value; //formdaki veriyi al

    if (!this.selectedHospital) { //seçili bi hastane yok ise
      this.defService.postHospital(hospitalData).subscribe({
        next: (res) => {
          alert('Yeni kayıt başarıyla eklendi!');
          this.gethospitaldef();
          this.newHospital();
        },
        error: (err) => {
          console.error('Kayıt hatası:', err);
          alert('Kayıt sırasında hata oluştu.');
        }
      });
    } else {
      // Güncelleme 
      console.log('Güncellenecek veri:', hospitalData);
      alert('Bu kısımda updateRank çağrısı yapılacak.');
    }
  }
  onRowSelect(h: Hospital) {
  this.selectedHospital = h;
  this.hospitalForm.patchValue(h);
  // this.hospitalForm.patchValue({
  //   id: h.id,
  //   code: h.code,
  //   name: h.name,
  //   cityCode: h.cityCode   
  // });
}
  detailPopupVisible = false;
 selectedRow: Hospital | null = null;

onDetailClick = (e: any) => {
  if (!e.row || !e.row.data) {
    console.error("Row gelmedi:", e);
    return;
  }

  this.selectedRow = e.row.data;
  this.detailPopupVisible = true;
};
onCellPrepared(e: any) {
  if (e.rowType === "data" && e.value !== undefined && e.value !== null) {
    e.cellElement.title = e.value.toString();
  }
}




}
