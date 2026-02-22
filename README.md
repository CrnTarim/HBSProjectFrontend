Senaryo:

PdfReportViewComponent → string[] reportNoList gönderiyor

ReportComponent →

Backend’den queryResult çekiyor

Service’ten reportNoList dinliyor

Hangisi önce gelirse gelsin doğru selection yapıyor

✅ 1️⃣ Service (Angular 6 Uyumlu)

report-no-share.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReportNoShareService {

  private reportNoSubject = new BehaviorSubject<string[]>([]);
  reportNo$ = this.reportNoSubject.asObservable();

  set(reportNos: string[]): void {
    this.reportNoSubject.next(reportNos || []);
  }

  clear(): void {
    this.reportNoSubject.next([]);
  }
}

✔ Angular 6
✔ RxJS 6
✔ null yok

✅ 2️⃣ PdfReportViewComponent (Gönderen)
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ReportNoShareService } from '../services/report-no-share.service';

@Component({
  selector: 'app-pdf-report-view',
  templateUrl: './pdf-report-view.component.html'
})
export class PdfReportViewComponent {

  constructor(
    private share: ReportNoShareService,
    private router: Router
  ) {}

  goToReport(): void {

    const reportNoList: string[] = this.extractFromPdf();

    this.share.set(reportNoList);

    this.router.navigate(['/report']);
  }

  private extractFromPdf(): string[] {
    return ['R001', 'R005', 'R010'];
  }
}
✅ 3️⃣ ReportComponent (Async Güvenli)

report.component.ts

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReportNoShareService } from '../services/report-no-share.service';
import { ReportService } from '../services/report.service';

interface QueryResultDto {
  id: string;
  reportNo: string;
  isSelected: boolean;
}

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html'
})
export class ReportComponent implements OnInit, OnDestroy {

  queryResult: QueryResultDto[] = [];
  selectedList: QueryResultDto[] = [];
  reportNoList: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private share: ReportNoShareService,
    private reportService: ReportService
  ) {}

  ngOnInit(): void {

    // 1️⃣ reportNo dinle
    this.share.reportNo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(reportNoList => {

        this.reportNoList = reportNoList || [];

        if (this.queryResult.length) {
          this.processSelection();
        }
      });

    // 2️⃣ backend data çek
    this.loadData();
  }

  loadData(): void {

    this.reportService.getReports()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {

        this.queryResult = data || [];

        if (this.reportNoList.length) {
          this.processSelection();
        }
      });
  }

  processSelection(): void {

    const reportNoSet = new Set(this.reportNoList);

    this.queryResult.forEach(item => {
      item.isSelected = reportNoSet.has(item.reportNo);
    });

    this.selectedList = this.queryResult.filter(x => x.isSelected);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
