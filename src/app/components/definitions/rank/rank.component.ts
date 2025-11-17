import { Component, OnInit, ViewChild } from '@angular/core';
import { Rank } from '../../../models/definition';
import { HosdefinitionService } from '../../../services/hosdefinition.service';
import { FormBuilder, FormGroup, Validators,ReactiveFormsModule } from '@angular/forms';
import { DxDataGridComponent } from 'devextreme-angular';

@Component({
  selector: 'app-rank',
  templateUrl: './rank.component.html',
  styleUrls: ['./rank.component.css']   
})
export class RankComponent implements OnInit {
  ranks: Rank[] = [];
  isLoading = true;
  selectedRank: Rank | null = null;
  popupVisible = false;
  rankForm!: FormGroup; 
  searchText: string = '';

@ViewChild('rankGrid', { static: false }) rankGrid!: DxDataGridComponent;
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
  this.rankForm = this.formBuilder.group({
    id: [null],
    code: [null, Validators.required],
    name: ['', Validators.required]
  });
}
  //  Grid verisi
  getrankdef() {
    this.defService.getRanks().subscribe({
      next: (data) => {
        this.ranks = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Rank verisi alınamadı', err);
        this.isLoading = false;
      }
    });
  }

  //  Gridde satıra tıklama
  onRowSelect(rank: Rank) {
    this.selectedRank = rank;
    this.rankForm.patchValue(rank);
  }

   newRank() {
    this.selectedRank = null;
    this.rankForm.reset();
    this.clearGridSearch();
  }
deleteRank() {
  if (!this.selectedRank || !this.selectedRank.id) {
    alert('Lütfen önce listeden bir kayıt seçin.');
    return;
  }

  const id = this.selectedRank.id;
  this.isLoading = true;

  this.defService.deleteRank(id).subscribe({
    next: (msg:string) => {
      console.log(msg);    
      this.getrankdef();
      this.selectedRank = null;
      this.rankForm.reset();
      this.isLoading = false;
    },
    error: (err:string) => {
      console.error('Silme sırasında hata oluştu', err);
      this.isLoading = false;
    }
  });
}


  //  Yeni kayıt modu
 
   onSearchChange() {
    if (!this.rankGrid) return;
    this.rankGrid.instance.searchByText(this.searchText || '');
  }

  // 2) Temizle butonu → input'u ve grid aramasını sıfırla
  clearGridSearch() {
    this.searchText = '';
    if (!this.rankGrid) return;
   
    this.rankGrid.instance.searchByText('');
    this.rankGrid.instance.clearFilter();
  }

  //  Kaydet butonuna basınca popup aç
  openConfirm() {
    if (this.rankForm.invalid) {
      alert('Lütfen gerekli alanları doldurun.');
      return;
    }
    this.popupVisible = true;
  }

  //  Popup içinden onay
  saveRank() {
    this.popupVisible = false;
    const rankData = this.rankForm.value;

    // Yeni kayıt
    if (!this.selectedRank) {
      this.defService.postRank(rankData).subscribe({
        next: (res) => {
          alert('Yeni kayıt başarıyla eklendi!');
          this.getrankdef();
          this.newRank();
        },
        error: (err) => {
          console.error('Kayıt hatası:', err);
          alert('Kayıt sırasında hata oluştu.');
        }
      });
    } else {
      // Güncelleme 
      console.log('Güncellenecek veri:', rankData);
      alert('Bu kısımda updateRank çağrısı yapılacak.');
    }
  }
}
