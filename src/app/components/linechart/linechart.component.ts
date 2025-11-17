import { Component, OnInit } from '@angular/core';
import PivotGridDataSource from 'devextreme/ui/pivot_grid/data_source';
import { forkJoin } from 'rxjs';
import { StatisticService } from '../../services/statistic.service';
import {
  CityDto, HospitalDto, DiagnosisDto, HCDecisionDto, FactReport,
  DatetimeInput, RankDto, ForceDto
} from '../../models/statistic';

type Issuer = 'MB' | 'PTM' | 'BH';
type PercentBasis = 'row' | 'column' | 'grand';
type ColumnKey = 'Diagnosis' | 'ReportState' | 'Decision';

type FactRow = FactReport & {
  created: Date;
  diagnosisCodesCsv?: string;
  diagnosesCsv?: string;
  reportStateName?: string;
  issuer: Issuer;
  diagSingle?: string;   // sanal (tek tanı sütunu)
  w?: number;            // ağırlık (1/k)
};

@Component({
  selector: 'app-linechart',
  templateUrl: './linechart.component.html',
  styleUrls: ['./linechart.component.css']
})
export class LinechartComponent implements OnInit {

  constructor(private api:StatisticService) {}

  /* ---- Tarih ---- */
  startDateStr = '';
  endDateStr   = '';
  datetimeInput: DatetimeInput = { StartDate: '', EndDate: '' };

  /* ---- Yüzde ekseni ---- */
  percentBasis: PercentBasis = 'row';

  /* ---- Lookuplar ---- */
  cities: CityDto[] = [];
  hospitals: HospitalDto[] = [];
  diagnoses: DiagnosisDto[] = [];
  decisions: HCDecisionDto[] = [];
  ranks: RankDto[] = [];
  forces: ForceDto[] = [];
  stateNames: string[] = [];

  /* ---- Ekran üstündeki aktif distinct rapor sayısı ---- */
  activeReportCount = 0;

  /* ---- State sözlüğü ---- */
  private static REPORT_STATE_TR: { [k: string]: string } = {
    Review: 'İncelemede',
    Approval: 'Onayda',
    Completed: 'Tamamlandı',
    CompletedWithNoApproval: 'Onaysız Tamamlandı',
    Annotation: 'Ek Açıklama',
    AnnotationReportApproval: 'Ek Rapor Onay',
    AnnotationReportReview: 'Ek Rapor İnceleme',
    CompletedWithAnnotationApproval: 'Ek Onay ile Tamamlandı',
    WaitingForReview: 'İnceleme Bekliyor',
    WaitingForCompletedWithNoApproval: 'Onaysız Tamamlama Bekliyor',
    Cancelled: 'İptal',
    CompletedAnnotationManuel: 'Manuel Ek Açıklama Tam.'
  };
  private static REPORT_STATES_EN: string[] = [
    'Review','Approval','Completed','CompletedWithNoApproval','Annotation',
    'AnnotationReportApproval','AnnotationReportReview','CompletedWithAnnotationApproval',
    'WaitingForReview','WaitingForCompletedWithNoApproval','Cancelled','CompletedAnnotationManuel'
  ];

  /* ---- Slicer seçimleri (default: hiçbiri seçili değil) ---- */
  selectedCityIds: string[] = [];
  selectedHospitalIds: string[] = [];
  selectedDiagnosisIds: string[] = []; // Tanı ID’leri
  selectedDecisionIds: string[] = [];
  selectedStates: string[] = [];
  issuers: Issuer[] = ['MB','PTM','BH'];
  selectedIssuers: Issuer[] = [];
  /** Rütbeyi isimle filtreliyoruz (HTML buna göre) */
  selectedRankNames: string[] = [];
  selectedForceIds: string[] = [];

  /* ---- Veri ---- */
  private factAll: FactRow[] = [];
  factActive: FactRow[] = [];

  /* ---- Pivot ---- */
  pivotDs: any = null;

  /* ---- Kolon sırası ---- */
  columnOrder: ColumnKey[] = [];

  /* ---- Satır alanları ---- */
  public rowSelected = { Issuer: false, City: true, Hospital: false, Rank: false, Force: false };

  /* ---- Ölçü görünürlükleri ---- */
  public showCount = true;     // Rapor (sayısı)
  public showDistinct = false; // ikinci metrik opsiyonel

  /* ---- Filtre panel bayrakları ---- */
  openCity = false;
  openHospital = false;
  openIssuer = false;
  openDiagnosis = false;
  openState = false;
  openDecision = false;
  openRank = false;
  openForce = false;

  /* ---- Search ---- */
  citySearch = '';
  hospitalSearch = '';
  diagnosisSearch = '';
  decisionSearch = '';
  stateSearch = '';
  rankSearch = '';
  forceSearch = '';

  /* ================== HELPERS ================== */
  private firstDefined<T>(...vals: (T | null | undefined)[]): T | undefined {
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (v !== null && v !== undefined) return v;
    }
    return undefined;
  }
  private pad2(n:number){ return n<10 ? '0'+n : ''+n; }
  private toInputDate(d: Date){
    return d.getFullYear() + '-' + this.pad2(d.getMonth()+1) + '-' + this.pad2(d.getDate());
  }
 private _match(q: string, text: any): boolean {
  if (!q) return true;
  if (text == null) return false;
  // Türkçe karakterleri normalize et (İ->i, ı->i vs.)
  const normalize = (s: string) =>
    s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return normalize(String(text)).includes(normalize(q));
}

  private _codes(csv: string | null | undefined): string[] {
    if (!csv) return [];
    return String(csv).split(';').map(s => s.trim()).filter(Boolean);
  }
  trState(k: string){ return LinechartComponent.REPORT_STATE_TR[k] || k || ''; }

  /* ================== INIT ================== */
  ngOnInit(): void {
    this.initDefaultDates();

    forkJoin([
      this.api.getCities(),
      this.api.getHospitals(),
      this.api.getDiagnoses(),
      this.api.getDecisions(),
      this.api.getReportStates(),
      this.api.getRanks(),
      this.api.getForces()
    ]).subscribe(
      ([cities, hospitals, diagnoses, decisions, states, ranks, forces]) => {
        this.cities    = cities    || [];
        this.hospitals = hospitals || [];
        this.diagnoses = diagnoses || [];
        this.decisions = decisions || [];
        this.stateNames = (states && states.length) ? states : LinechartComponent.REPORT_STATES_EN.slice();
        this.ranks = ranks || [];
        this.forces = forces || [];
        this.onFetch();
      },
      err => console.error('Lookup load failed', err)
    );
  }

  private initDefaultDates(){
    const end = new Date();
    const start = new Date(end.getTime() - 30*86400000);
    this.startDateStr = this.toInputDate(start);
    this.endDateStr   = this.toInputDate(end);
  }

  /* ================== DATA FETCH (FACT) ================== */
  onFetch(): void {
    if (!this.startDateStr || !this.endDateStr){
      this.factAll=[]; this.factActive=[]; this.pivotDs=null; this.activeReportCount = 0; return;
    }
    this.datetimeInput.StartDate = this.startDateStr;
    this.datetimeInput.EndDate   = this.endDateStr;

    this.api.getFact(this.datetimeInput).subscribe(
      (rows: any[]) => {
        const data: FactRow[] = (rows || []).map((r: any) => {
          const createdDateStr = this.firstDefined<string>(r.createdDate, r.CreatedDate) as string;

          // normalize alanlar
          const normalized: any = {
            reportId:        this.firstDefined(r.reportId,        r.ReportId),
            reportCode:      this.firstDefined(r.reportCode,      r.ReportCode),
            reportState:     this.firstDefined(r.reportState,     r.ReportState),
            reportStateName: this.firstDefined(r.reportStateName, r.ReportStateName),
            
            cityId:          this.firstDefined(r.cityId,          r.CityId),
            cityName:        this.firstDefined(r.cityName,        r.CityName),
            cityCode:        Number(this.firstDefined(r.cityCode, r.CityCode)),

            hospitalId:      this.firstDefined(r.hospitalId,      r.HospitalId),
            hospitalName:    this.firstDefined(r.hospitalName,    r.HospitalName),
            provisionId:     this.firstDefined(r.provisionId,     r.ProvisionId),
            decisionId:      this.firstDefined(r.decisionId,      r.DecisionId),
            decisionName:    this.firstDefined(r.decisionName,    r.DecisionName),
            rankId:          this.firstDefined(r.rankId,          r.RankId),
            rankName:        this.firstDefined(r.rankName,        r.RankName),

            forceId:         this.firstDefined(r.forceId,         r.ForceId), 
            forceCode:       this.firstDefined(r.forceCode,       r.ForceCode),
            forceName:       this.firstDefined(r.forceName,       r.ForceName),

            diagnosisCodesCsv: (this.firstDefined(r.diagnosisCodesCsv, r.DiagnosesCsv, r.DiagnosisCodesCsv) || '') as string,
            diagnosesCsv:      (this.firstDefined(r.diagnosesCsv,      r.DiagnosesCsv)                      || '') as string,
            issuer:            (this.firstDefined(r.issuer, r.Issuer) || 'BH') as Issuer,

            reviewerId : this.firstDefined(r.reviewerId,         r.ReviewerId), 
            approverId : this.firstDefined(r.approverId,         r.ApproverId), 
            createdDate: createdDateStr,
            created: new Date(createdDateStr)
          };

          return Object.assign({}, r, normalized) as FactRow;
        });

        this.factAll = data;
        this.applyFilters(true);
      },
      err => { console.error('getFact error', err); this.factAll=[]; this.factActive=[]; this.pivotDs=null; this.activeReportCount = 0; }
    );
  }

  /* ================== UI HELPERS ================== */
  hospitalsForUI(): HospitalDto[] {
    if (!this.selectedCityIds.length) return this.hospitals;
    const s = new Set(this.selectedCityIds.map(String));
    return this.hospitals.filter(h => s.has(String(h.cityId)));
  }
  hospitalsForUIFiltered(): HospitalDto[] {
    const base = this.hospitalsForUI();
    if (!this.hospitalSearch) return base;
    return base.filter(h => this._match(this.hospitalSearch, h.name));
  }
  citiesFiltered(): CityDto[] {
    if (!this.citySearch) return this.cities;
    return this.cities.filter(c => this._match(this.citySearch, c.name));
  }
  ranksForUIFiltered(): RankDto[] {
    if (!this.rankSearch) return this.ranks;
    return this.ranks.filter(c => this._match(this.rankSearch, c.name));
  }
  forcesForUIFiltered(): ForceDto[] {
    if (!this.forceSearch) return this.forces;
    return this.forces.filter(c => this._match(this.forceSearch, c.name));
  }
  diagnosesFiltered(): DiagnosisDto[] {
    if (!this.diagnosisSearch) return this.diagnoses;
    return this.diagnoses.filter(d => this._match(this.diagnosisSearch, d.name) || this._match(this.diagnosisSearch, d.code));
  }
  decisionsFiltered(): HCDecisionDto[] {
    if (!this.decisionSearch) return this.decisions;
    return this.decisions.filter(k =>
      this._match(this.decisionSearch, k.name) || this._match(this.decisionSearch, k.code)
    );
  }
  statesFiltered(): string[] {
    if (!this.stateSearch) return this.stateNames;
    const q = this.stateSearch;
    return this.stateNames.filter(s => this._match(q, s) || this._match(q, this.trState(s)));
  }
  isSelected(arr: any[], id: any){ return arr.indexOf(id) !== -1; }
  private toggleIn<T>(arr: T[], v: T): T[] {
    const i = arr.indexOf(v);
    return i >= 0 ? (arr.filter(x => x !== v) as any) : arr.concat(v);
  }

  /* ================== TOGGLES ================== */
  toggleCity(id: any)       { this.selectedCityIds      = this.toggleIn(this.selectedCityIds, id);       this.applyFilters(); }
  toggleHospital(id: any)   { this.selectedHospitalIds  = this.toggleIn(this.selectedHospitalIds, id);   this.applyFilters(); }
  toggleDiagnosis(id: any)  { this.selectedDiagnosisIds = this.toggleIn(this.selectedDiagnosisIds, id);  this.applyFilters(true); }
  toggleDecision(id: any)   { this.selectedDecisionIds  = this.toggleIn(this.selectedDecisionIds, id);   this.applyFilters(); }
  toggleState(name: string) { this.selectedStates       = this.toggleIn(this.selectedStates, name);      this.applyFilters(); }
  toggleIssuer(name: Issuer){ this.selectedIssuers      = this.toggleIn(this.selectedIssuers, name);     this.applyFilters(); }
  /** Rütbe artık İSİM ile seçiliyor */
  toggleRank(name: string)  { this.selectedRankNames    = this.toggleIn(this.selectedRankNames, name);   this.applyFilters(); }
  toggleForce(id: any)      { this.selectedForceIds     = this.toggleIn(this.selectedForceIds, id);      this.applyFilters(); }

  /* ================== PANEL AÇ/KAPA ================== */
  openOnlyRegion(which: 'City' | 'Hospital' | 'Issuer' | 'Rank' | 'Force') {
    this.openCity     = (which === 'City')     ? !this.openCity     : false;
    this.openHospital = (which === 'Hospital') ? !this.openHospital : false;
    this.openIssuer   = (which === 'Issuer')   ? !this.openIssuer   : false;
    this.openRank     = (which === 'Rank')     ? !this.openRank     : false;
    this.openForce    = (which === 'Force')    ? !this.openForce    : false;


  }
  openOnlyCriteria(which: 'Diagnosis' | 'ReportState' | 'Decision') {
    this.openDiagnosis = (which === 'Diagnosis')   ? !this.openDiagnosis : false;
    this.openState     = (which === 'ReportState') ? !this.openState     : false;
    this.openDecision  = (which === 'Decision')    ? !this.openDecision  : false;
  }

  /* ================== ROW TOGGLE ================== */
  // public toggleRow(kind: 'Issuer' | 'City' | 'Hospital' | 'Rank' | 'Force') {
  //   (this.rowSelected as any)[kind] = !(this.rowSelected as any)[kind];
  //   if (!this.rowSelected.Issuer && !this.rowSelected.City && !this.rowSelected.Hospital && !this.rowSelected.Force && !this.rowSelected.Rank) {
  //     (this.rowSelected as any)[kind] = true;
  //   }
  //   this.openOnlyRegion(kind);
  //   this.updatePivot();
  // }

  public toggleRow(kind: 'Issuer' | 'City' | 'Hospital' | 'Rank' | 'Force') {

  (this.rowSelected as any)[kind] = !(this.rowSelected as any)[kind];

  // 2️⃣ Aynı anda toggle açık/kapalı durumu da değişsin (bağımsız)
  if (kind === 'City')     this.openCity = this.rowSelected.City;
  if (kind === 'Hospital') this.openHospital = this.rowSelected.Hospital;
  if (kind === 'Issuer')   this.openIssuer = this.rowSelected.Issuer;
  if (kind === 'Rank')     this.openRank = this.rowSelected.Rank;
  if (kind === 'Force')    this.openForce = this.rowSelected.Force;

  
  this.updatePivot();
}


  /* ================== PIVOT FIELDS ================== */
  private buildFields(): any[] {
    const fields: any[] = [];

    // Satırlar
    const issuer: any = { dataField: 'issuer', caption: 'Onaylayan' };
    if (this.rowSelected.Issuer) { issuer.area = 'row'; }
    fields.push(issuer);

    if (this.rowSelected.Force) {
      fields.push({ dataField: 'forceCode', caption: 'Kuvvet', area: 'row' });
    }
    if (this.rowSelected.Rank) {
      fields.push({ dataField: 'rankName', caption: 'Rütbe', area: 'row' });
    }
    if (this.rowSelected.City) {
      fields.push({ dataField: 'cityCode', caption: 'Şehir', area: 'row' });
    }
    if (this.rowSelected.Hospital) {
      fields.push({ dataField: 'hospitalName', caption: 'Hastane', area: 'row' });
    }

    // Sütun kriterleri
    for (let i = 0; i < this.columnOrder.length; i++) {
      const k = this.columnOrder[i];
      if (k === 'Diagnosis') {
        fields.push({
          dataField: 'diagSingle',
          caption: 'Tanı (Kod)',
          area: 'column'
        });
      } else if (k === 'ReportState') {
        fields.push({
          dataField: 'reportStateName',
          caption: 'Rapor Durumu',
          area: 'column',
          customizeText: (cellInfo: any) => {
            const raw = (cellInfo && (cellInfo.valueText || cellInfo.text || cellInfo.value)) || '';
            return this.trState(String(raw));
          }
        });
      } else {
        fields.push({ dataField: 'decisionName', caption: 'Karar', area: 'column' });
      }
    }

    // ---- Ölçüler ----
    // A) DISTINCT rapor sayısı (asıl sayı)
    fields.push({
      name: 'cntRows',
      caption: 'Rapor (sayısı)',
      area: 'data',
      dataField: 'reportId',
      summaryType: 'custom',
      calculateCustomSummary: (o:any) => this.calcDistinctReport(o),
      visible: this.showCount
    });

    // B) Oran: ağırlık toplamı (1/k) — %’leri pivot hesaplar
    const mode = this.percentBasis === 'row'
      ? 'percentOfRowTotal'
      : (this.percentBasis === 'column' ? 'percentOfColumnTotal' : 'percentOfGrandTotal');

    fields.push({
      name: 'ratioOnCount',
      caption: 'Oran (rapor %)',
      area: 'data',
      dataField: 'w',
      summaryType: 'sum',
      summaryDisplayMode: mode,
      format: { type: 'percent', precision: 2 },
      visible: true
    });

    // İkinci metrik istersek
    fields.push({
      name: 'cntDistinctReports',
      caption: 'Rapor (distinct)',
      area: 'data',
      dataField: 'reportId',
      summaryType: 'custom',
      calculateCustomSummary: (o:any) => this.calcDistinctReport(o),
      visible: this.showDistinct
    });

    return fields;
  }

  private calcDistinctReport(o:any){
    if (o.summaryProcess === 'start') {
      o._set = new Set<string>();
    } else if (o.summaryProcess === 'calculate') {
      const id = o.value != null ? String(o.value) : '';
      if (id) o._set.add(id);
    } else if (o.summaryProcess === 'finalize') {
      o.totalValue = o._set.size;
    }
  }

  /* ================== FİLTRE & AĞIRLIKLANDIRMA ================== */
  // private applyFilters(initial = false): void {
  //   // Seçili tanı ID → kod seti
  //   const selectedDiagCodes = new Set(
  //     this.diagnoses
  //       .filter(d => this.selectedDiagnosisIds.indexOf(String(d.id)) !== -1)
  //       .map(d => String(d.code))
  //   );

  //   const diagnosisInColumns = this.columnOrder.indexOf('Diagnosis') !== -1;

  //   let prepared: FactRow[] = [];

  //   for (let idx = 0; idx < this.factAll.length; idx++) {
  //     const r = this.factAll[idx];
  //     const reportCodesSet = new Set(this._codes(r.diagnosisCodesCsv));
  //     const reportCodesArr = Array.from(reportCodesSet);

  //     if (diagnosisInColumns) {
  //       const targetCodes = selectedDiagCodes.size
  //         ? reportCodesArr.filter(code => selectedDiagCodes.has(code))
  //         : reportCodesArr;

  //       if (targetCodes.length > 0) {
  //         const w = 1 / targetCodes.length;
  //         for (let j = 0; j < targetCodes.length; j++) {
  //           prepared.push(Object.assign({}, r, { diagSingle: targetCodes[j], w }));
  //         }
  //       }
  //     } else {
  //       prepared.push(Object.assign({}, r, { w: 1 }));
  //     }
  //   }

  //   // Diğer slicer filtreleri SENİN MEVCUT AKIŞINDA olduğu gibi burada kalabilir
  //   const selCity     = new Set(this.selectedCityIds.map(String));
  //   const selHosp     = new Set(this.selectedHospitalIds.map(String));
  //   const selState    = new Set(this.selectedStates.map(String));
  //   const selIssuer   = new Set(this.selectedIssuers.map(String));
  //   const selDecision = new Set(this.selectedDecisionIds.map(String));
  //   const selRankName = new Set(this.selectedRankNames.map(String));
  //   const selForce    = new Set(this.selectedForceIds.map(String));

  //   const filtered = prepared.filter(r => {
  //     if (selIssuer.size   && !selIssuer.has(String(r.issuer))) return false;
  //     if (selCity.size     && !selCity.has(String(r.cityId))) return false;
  //     if (selHosp.size     && !selHosp.has(String(r.hospitalId))) return false;
  //     if (selRankName.size && (!r.rankName || !selRankName.has(String(r.rankName)))) return false;
  //     if (selForce.size    && (!r.forceId || !selForce.has(String(r.forceId)))) return false;
  //     if (selState.size    && !selState.has(String(r.reportStateName))) return false;
  //     if (selDecision.size && (!r.decisionId || !selDecision.has(String(r.decisionId)))) return false;
  //     return true;
  //   });

  //   // ---- güncelle + reload ----
  //   if (this.pivotDs && !initial) {
  //     this.factActive.splice(0, this.factActive.length, ...filtered);
  //     this.recomputeActiveCount();
  //     this.pivotDs.reload();
  //   } else {
  //     this.factActive = filtered;
  //     this.recomputeActiveCount();
  //     this.updatePivot();
  //   }
  // }
private applyFilters(initial = false): void {
  // ---- 1) Tanı çoğaltma / ağırlık ----
  const selectedDiagCodes = new Set(
    this.diagnoses
      .filter(d => this.selectedDiagnosisIds.indexOf(String(d.id)) !== -1)
      .map(d => String(d.code))
  );
  const diagnosisInColumns = this.columnOrder.indexOf('Diagnosis') !== -1;

  let prepared: FactRow[] = [];
  for (let i = 0; i < this.factAll.length; i++) {
    const r = this.factAll[i];
    const reportCodesArr = Array.from(new Set(this._codes(r.diagnosisCodesCsv)));

    if (diagnosisInColumns) {
      const target = this.selectedDiagnosisIds.length > 0
        ? reportCodesArr.filter(c => selectedDiagCodes.has(c))
        : reportCodesArr;

      if (target.length > 0) {
        const w = 1 / target.length;
        for (let j = 0; j < target.length; j++) {
          prepared.push({ ...(r as any), diagSingle: target[j], w });
        }
      }
    } else {
      prepared.push({ ...(r as any), w: 1 });
    }
  }

  // ---- 2) ETKİN setler (Bölge: pil AÇIK **ve** seçim VAR; Kriter: seçim VAR) ----
  const eff = <T>(arr: T[]) =>
    (arr && arr.length > 0) ? new Set(arr.map(x => String(x))) : null;

  // Bölge filtreleri PİL'e bağlı (kapalıysa tamamen devre dışı)
  const selCity     = (this.rowSelected.City     ? eff(this.selectedCityIds)      : null);
  const selHosp     = (this.rowSelected.Hospital ? eff(this.selectedHospitalIds)  : null);
  const selIssuer   = (this.rowSelected.Issuer   ? eff(this.selectedIssuers)      : null);
  const selRankName = (this.rowSelected.Rank     ? eff(this.selectedRankNames)    : null);
  const selForce    = (this.rowSelected.Force    ? eff(this.selectedForceIds)     : null);

  // Kriterlerde pil yok: yalnızca seçim varsa uygula
  const selState    = eff(this.selectedStates);
  const selDecision = eff(this.selectedDecisionIds);

  // ---- 3) Filtreleme (yalnız ETKİN setler uygular) ----
  const filtered = prepared.filter(r => {
    if (selIssuer   && !selIssuer.has(String(r.issuer))) return false;
    if (selCity     && !selCity.has(String(r.cityId))) return false;
    if (selHosp     && !selHosp.has(String(r.hospitalId))) return false;
    if (selRankName && (!r.rankName || !selRankName.has(String(r.rankName)))) return false;
    if (selForce    && (!r.forceId || !selForce.has(String(r.forceId)))) return false;

    if (selState    && !selState.has(String(r.reportStateName))) return false;
    if (selDecision && (!r.decisionId || !selDecision.has(String(r.decisionId)))) return false;
    return true;
  });

  // ---- 4) Güncelle + reload ----
  if (this.pivotDs && !initial) {
    this.factActive.splice(0, this.factActive.length, ...filtered);
    this.recomputeActiveCount();
    this.pivotDs.reload();
  } else {
    this.factActive = filtered;
    this.recomputeActiveCount();
    this.updatePivot();
  }
}

  private recomputeActiveCount(){
    const set = new Set<string>();
    for (let i=0; i<this.factActive.length; i++){
      const id = String(this.factActive[i].reportId || '');
      if (id) set.add(id);
    }
    this.activeReportCount = set.size;
  }

  /* ================== PIVOT ================== */
  public updatePivot(): void {
    if (!this.factActive.length){ this.pivotDs=null; return; }
    this.pivotDs = new PivotGridDataSource({ fields: this.buildFields(), store: this.factActive });
    setTimeout(() => {
      this.toggleMeasure('cntRows', this.showCount, false);
      this.toggleMeasure('cntDistinctReports', this.showDistinct, false);
    });
  }

  /** Ölçü görünürlüğünü değiştirir */
  public toggleMeasure(name: 'cntRows'|'cntDistinctReports', on: boolean, reload: boolean = true){
    if (!this.pivotDs) return;
    this.pivotDs.field(name, { visible: on });
    if (reload) this.pivotDs.reload();
  }

  /* ---- Kriter pilleri ---- */
  toggleColumn(kind: ColumnKey){
    const i = this.columnOrder.indexOf(kind);
    if (i >= 0) this.columnOrder.splice(i, 1);
    else { if (this.columnOrder.length === 3) this.columnOrder.shift(); this.columnOrder.push(kind); }
    this.openOnlyCriteria(kind);
    this.applyFilters(true);
  }
  columnRank(kind: ColumnKey){
    const i = this.columnOrder.indexOf(kind);
    return i >= 0 ? i+1 : null;
  }

  /* ================== TOPLU SEÇ / TEMİZLE ================== */
  // Şehir
  selectAllCities(){ this.selectedCityIds = this.citiesFiltered().map(c => String(c.id)); this.applyFilters(); }
  clearAllCities(){ this.selectedCityIds = []; this.applyFilters(); }

  // Hastane (şehre göre daralan liste)
  selectAllHospitals(){ this.selectedHospitalIds = this.hospitalsForUIFiltered().map(h => String(h.id)); this.applyFilters(); }
  clearAllHospitals(){ this.selectedHospitalIds = []; this.applyFilters(); }

  // Kuvvet
  selectAllForces(){ this.selectedForceIds = this.forcesForUIFiltered().map(f => String(f.id)); this.applyFilters(); }
  clearAllForces(){ this.selectedForceIds = []; this.applyFilters(); }

  // Rütbe (isimle)
  selectAllRanks(){ this.selectedRankNames = this.ranksForUIFiltered().map(r => String(r.name)); this.applyFilters(); }
  clearAllRanks(){ this.selectedRankNames = []; this.applyFilters(); }

  // Onaylayan
  selectAllIssuers(){ this.selectedIssuers = this.issuers.slice(); this.applyFilters(); }
  clearAllIssuers(){ this.selectedIssuers = []; this.applyFilters(); }

  // Tanı (ID) — çoğaltma/ağırlık değiştiği için initial=true
  selectAllDiagnoses(){ this.selectedDiagnosisIds = this.diagnosesFiltered().map(d => String(d.id)); this.applyFilters(true); }
  clearAllDiagnoses(){ this.selectedDiagnosisIds = []; this.applyFilters(true); }

  // Durum (EN key)
  selectAllStates(){ this.selectedStates = this.statesFiltered().slice(); this.applyFilters(); }
  clearAllStates(){ this.selectedStates = []; this.applyFilters(); }
  // Karar — toplu seç / temizle
selectAllDecisions() {
  this.selectedDecisionIds = this.decisionsFiltered().map(k => String(k.id));
  this.applyFilters();  // tanıya dokunmadığı için initial=false
}

clearAllDecisions() {
  this.selectedDecisionIds = [];
  this.applyFilters();
}

}
