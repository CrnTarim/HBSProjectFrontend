import { Component, ViewChild } from '@angular/core';
import { HosdefinitionService } from '../../../services/hosdefinition.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Hospital } from '../../../models/definition';
import { DxDataGridComponent } from 'devextreme-angular';

@Component({
  selector: 'app-hospital',
  templateUrl: './hospital.component.html',
  styleUrl: './hospital.component.css'
})
export class HospitalComponent {

  hospitals: Hospital[] = [];
  isLoading = true;
  selectedHospital: Hospital| null = null;
  popupVisible = false;
  hospitalForm!: FormGroup; 
  searchText: string = '';
  citycodes: number[] = []; 

@ViewChild('hospitalGrid', { static: false }) hospitalGrid!: DxDataGridComponent;  
constructor(
    private defService: HosdefinitionService,
    private formBuilder: FormBuilder
  ) {}
 
  ngOnInit(): void {
    //  reactive form
    this.initForm();

    this.getrankdef();
  }
private initForm(): void {
  this.hospitalForm = this.formBuilder.group({
    id: [null],
    code: [null, Validators.required],
    name: ['', Validators.required],
    citycode: [null, Validators.required]
  });
}
  //  Grid verisi getir
  getrankdef() {
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

  //  Gridde satıra seç
  onRowSelect(hospital:Hospital)
  {
    this.selectedHospital=hospital;// seçimi tut
    this.hospitalForm.patchValue(hospital);//seçimi forma ayzdır
  }
//Form temizle
   newHospital() {
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

  this.defService.deleteRank(id).subscribe({
    next: (msg:string) => {
      console.log(msg);    
      this.getrankdef();
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
    if (this.hospitalForm.invalid) {
      alert('Lütfen gerekli alanları doldurun.');
      return;
    }
    this.popupVisible = true;
  }

  //  Kaydet onay
  saveHospital() {
    this.popupVisible = false; //kaydete basınca popupı kapat
    const hospitalData = this.hospitalForm.value; //formdaki veriyi al

    if (!this.selectedHospital) { //seçili bi hastane yok ise
      this.defService.postRank(hospitalData).subscribe({
        next: (res) => {
          alert('Yeni kayıt başarıyla eklendi!');
          this.getrankdef();
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
}
