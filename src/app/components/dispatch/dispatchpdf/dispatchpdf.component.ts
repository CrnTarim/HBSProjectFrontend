import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DispatchService } from '../../../services/dispatch.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-dispatchpdf',
  templateUrl: './dispatchpdf.component.html',
  styleUrl: './dispatchpdf.component.css'
})
export class DispatchpdfComponent {

  @Input() dispatchIds: string[] = [];
  @Output() finished = new EventEmitter<string[]>();

  currentIndex = 0;
  savedIds: string[] = [];
  pdfUrl?: SafeResourceUrl;

  constructor(
    private dispatchService: DispatchService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadPdf();
  }

  //indexteki pdfi ekrana getir
  loadPdf() {
    const id = this.dispatchIds[this.currentIndex];

    this.dispatchService.getDispatchPdf(id).subscribe(blob => {
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    });
  }

  //indexteki değer kayıtlı değil ise kayıtlistesine ekle ve index metotunu cagır
  onSave() {
    const id = this.dispatchIds[this.currentIndex];
    if (!this.savedIds.includes(id)) {
      this.savedIds.push(id);
    }
    this.goNextOrFinish();
  }

  onCancel() {
    // bu PDF bilinçli olarak kaydedilmiyor
    this.goNextOrFinish();
  }

  //indexi arttır laodpdfi cagır
  goNextOrFinish() {
    if (this.currentIndex < this.dispatchIds.length - 1) {
      this.currentIndex++;
      this.loadPdf();
      return;
    }

    this.finished.emit(this.savedIds);
  }
}

//  oku-> karar ver(save |cancel)-> sonuncu mu?(laod | emit) 
// state = 0
// saved = []

// while state < N:
//     show PDF[state]
//     wait for user decision

//     if decision == SAVE:
//         saved.add(PDF[state])

//     if state == N - 1:
//         emit(saved)
//         end
//     else:
//         state = state + 1
