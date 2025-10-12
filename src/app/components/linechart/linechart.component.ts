import { Component, OnInit } from '@angular/core';
import PivotGridDataSource from 'devextreme/ui/pivot_grid/data_source';
import { forkJoin } from 'rxjs';
import { DefinitionService } from '../../services/definition.service';
import {
  CityDto, HospitalDto, DiagnosisDto, HCDecisionDto, FactReport,
  DatetimeInput
} from '../../models/definition';

type Issuer = 'MB' | 'PTM' | 'BH';
type PercentBasis = 'row' | 'column' | 'grand';
type ColumnKey = 'Diagnosis' | 'ReportState' | 'Decision';

@Component({
  selector: 'app-linechart',
  templateUrl: './linechart.component.html',
  styleUrls: ['./linechart.component.css']
})
export class LinechartComponent implements OnInit {

  constructor(private api: DefinitionService) {}

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
  stateNames: string[] = [];
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

  /* ---- Slicer seçimleri ---- */
  selectedCityIds: any[] = [];
  selectedHospitalIds: any[] = [];
  selectedDiagnosisIds: any[] = [];
  selectedDecisionIds: any[] = [];
  selectedStates: string[] = [];
  issuers: Issuer[] = ['MB','PTM','BH'];
  selectedIssuers: Issuer[] = [];

  /* ---- Veri ---- */
  private factAll: (FactReport & { created: Date })[] = [];
  factActive: (FactReport & { created: Date })[] = [];

  /* ---- Pivot ---- */
  pivotDs: any = null;

  /* ---- Kolon sırası ---- */
  columnOrder: ColumnKey[] = [];

  /* ---- Satır alanları ---- */
  public rowSelected = { Issuer: false, City: true, Hospital: false };

  /* ---- Ölçü görünürlükleri ---- */
  public showCount = true;
  public showDistinct = true;

  /* ---- Filtre panel bayrakları ---- */
  openCity = false; openHospital = false; openIssuer = false;
  openDiagnosis = false; openState = false; openDecision = false;

  /* ---- Search state ---- */
  citySearch = '';
  hospitalSearch = '';
  diagnosisSearch = '';
  decisionSearch = '';
  stateSearch = '';

  /* ================== INIT ================== */
  ngOnInit(): void {
    this.initDefaultDates();

    forkJoin([
      this.api.getCities(),
      this.api.getHospitals(),
      this.api.getDiagnoses(),
      this.api.getDecisions(),
      this.api.getReportStates()
    ]).subscribe(
      ([cities, hospitals, diagnoses, decisions, states]) => {
        this.cities     = cities     || [];
        this.hospitals  = hospitals  || [];
        this.diagnoses  = diagnoses  || [];
        this.decisions  = decisions  || [];
        this.stateNames = states     || [];
        // fallback
        if (!this.stateNames?.length) {
          this.stateNames = LinechartComponent.REPORT_STATES_EN.slice();
        }
        this.onFetch();
      },
      err => { console.error('Lookup load failed', err); }
    );
  }

  trState(k: string){ return LinechartComponent.REPORT_STATE_TR[k] || k || ''; }

  /* ================== DATE HELPERS ================== */
  private pad2(n:number){ return n<10 ? '0'+n : ''+n; }
  private toInputDate(d: Date){
    return d.getFullYear() + '-' + this.pad2(d.getMonth()+1) + '-' + this.pad2(d.getDate());
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
      this.factAll=[]; this.factActive=[]; this.pivotDs=null; return;
    }
    this.datetimeInput.StartDate = this.startDateStr;
    this.datetimeInput.EndDate   = this.endDateStr;

    this.api.getFact(this.datetimeInput).subscribe(
      (rows: any[]) => {
        const data = (rows || []).map(r => ({ ...r, created: new Date(r.createdDate as string) }));
        this.factAll = data;
        this.factActive = data.slice();
        this.updatePivot();
      },
      err => { console.error('getFact error', err); this.factAll=[]; this.factActive=[]; this.pivotDs=null; }
    );
  }

  /* ================== SEARCH HELPERS ================== */
  private _match(q: string, text: any): boolean {
    if (!q) return true;
    if (text == null) return false;
    return String(text).toLowerCase().indexOf(q.toLowerCase()) !== -1;
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
  diagnosesFiltered(): DiagnosisDto[] {
    if (!this.diagnosisSearch) return this.diagnoses;
    return this.diagnoses.filter(d => this._match(this.diagnosisSearch, d.name));
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
  toggleCity(id: any)      { this.selectedCityIds      = this.toggleIn(this.selectedCityIds, id);       this.applyFilters(); }
  toggleHospital(id: any)  { this.selectedHospitalIds  = this.toggleIn(this.selectedHospitalIds, id);   this.applyFilters(); }
  toggleDiagnosis(id: any) { this.selectedDiagnosisIds = this.toggleIn(this.selectedDiagnosisIds, id);  this.applyFilters(); }
  toggleDecision(id: any)  { this.selectedDecisionIds  = this.toggleIn(this.selectedDecisionIds, id);   this.applyFilters(); }
  toggleState(name: string){ this.selectedStates       = this.toggleIn(this.selectedStates, name);      this.applyFilters(); }
  toggleIssuer(name: Issuer){ this.selectedIssuers     = this.toggleIn(this.selectedIssuers, name);     this.applyFilters(); }

  /* ================== PANEL AÇ/KAPA ================== */
  openOnlyRegion(which: 'City' | 'Hospital' | 'Issuer') {
    this.openCity     = (which === 'City')     ? !this.openCity     : false;
    this.openHospital = (which === 'Hospital') ? !this.openHospital : false;
    this.openIssuer   = (which === 'Issuer')   ? !this.openIssuer   : false;
  }
  openOnlyCriteria(which: 'Diagnosis' | 'ReportState' | 'Decision') {
    this.openDiagnosis = (which === 'Diagnosis')   ? !this.openDiagnosis : false;
    this.openState     = (which === 'ReportState') ? !this.openState     : false;
    this.openDecision  = (which === 'Decision')    ? !this.openDecision  : false;
  }

  /* ================== ROW TOGGLE ================== */
  public toggleRow(kind: 'Issuer' | 'City' | 'Hospital') {
    (this.rowSelected as any)[kind] = !(this.rowSelected as any)[kind];
    if (!this.rowSelected.Issuer && !this.rowSelected.City && !this.rowSelected.Hospital) {
      (this.rowSelected as any)[kind] = true;
    }
    this.openOnlyRegion(kind);
    this.updatePivot();
  }

  /* ================== PIVOT ================== */
  private buildFields(): any[] {
    const fields: any[] = [];

    // Satır alanları
    const issuer: any = { dataField: 'issuer', caption: 'Onaylayan' };
    if (this.rowSelected.Issuer) { issuer.area = 'row'; }
    fields.push(issuer);

    if (this.rowSelected.City) {
      fields.push({ dataField: 'cityName', caption: 'Şehir', area: 'row' });
    }
    if (this.rowSelected.Hospital) {
      fields.push({ dataField: 'hospitalName', caption: 'Hastane', area: 'row' });
    }

    // Sütun alanları (kriterler)
    for (let i = 0; i < this.columnOrder.length; i++) {
      const k = this.columnOrder[i];
      if (k === 'Diagnosis') {
        fields.push({ dataField: 'diagnosisCode', caption: 'Tanı (Kod)', area: 'column' });
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

    // ---- Veri alanları ----
    // 1) Rapor (count) = flat satır sayısı (rapor×tanı)
    fields.push({
      name: 'cntRows',
      caption: 'Rapor (count)',
      area: 'data',
      dataField: 'reportId',
      summaryType: 'count',
      visible: this.showCount
    });

    // 2) Rapor (distinct) = tekil rapor sayısı
    // dataField: 'reportId' => options.value = reportId
    fields.push({
      name: 'cntDistinctReports',
      caption: 'Rapor (distinct)',
      area: 'data',
      dataField: 'reportId',
      summaryType: 'custom',
      calculateCustomSummary: (o:any) => this.calcDistinctReport(o),
      visible: this.showDistinct
    });

    // 3) Oran (count üstünden %)
    const mode = this.percentBasis === 'row'
      ? 'percentOfRowTotal'
      : (this.percentBasis === 'column' ? 'percentOfColumnTotal' : 'percentOfGrandTotal');

    fields.push({
      name: 'ratioOnCount',
      caption: 'Oran (count)',
      area: 'data',
      dataField: 'reportId',
      summaryType: 'count',
      summaryDisplayMode: mode,
      format: { type: 'percent', precision: 2 },
      visible: true
    });

    return fields;
  }

  private calcDistinctReport(o:any){
    if (o.summaryProcess === 'start') {
      o._set = new Set<string>();
    } else if (o.summaryProcess === 'calculate') {
      // o.value: dataField'in değeri => reportId
      if (o.value != null) o._set.add(String(o.value));
    } else if (o.summaryProcess === 'finalize') {
      o.totalValue = o._set.size;
    }
  }

  public updatePivot(): void {
    if (!this.factActive.length){ this.pivotDs=null; return; }
    this.pivotDs = new PivotGridDataSource({ fields: this.buildFields(), store: this.factActive });
    const self = this;
    setTimeout(function(){
      // alanların görünürlüklerini UI flag'lerine göre sağlam al
      self.toggleMeasure('cntRows', self.showCount, false);
      self.toggleMeasure('cntDistinctReports', self.showDistinct, false);
      self.applyFilters();
    });
  }

  /** Ölçü görünürlüğünü değiştirir */
  public toggleMeasure(name: 'cntRows'|'cntDistinctReports', on: boolean, reload: boolean = true){
    if (!this.pivotDs) return;
    this.pivotDs.field(name, { visible: on });
    if (reload) this.pivotDs.reload();
  }

  private buildNameMap(list: { id?: any; name?: any }[]): Map<string, string> {
    const m = new Map<string, string>();
    for (let i=0; i<list.length; i++) {
      const x: any = list[i];
      if (x && x.id != null && x.name != null) m.set(String(x.id), String(x.name));
    }
    return m;
  }
  private buildCodeMap<T extends { id?: any }>(list: T[], prop: keyof T): Map<string, any> {
    const m = new Map<string, any>();
    for (let i = 0; i < list.length; i++) {
      const x: any = list[i];
      if (x && x.id != null && x[prop] != null) m.set(String(x.id), x[prop]);
    }
    return m;
  }

  private applyFilters(): void {
    if (!this.pivotDs) return;

    const cityMap     = this.buildNameMap(this.cities);
    const hospMap     = this.buildNameMap(this.hospitals);
    const diagCodeMap = this.buildCodeMap(this.diagnoses, 'code');
    const decMap      = this.buildNameMap(this.decisions);

    function namesFrom(ids: any[], m: Map<string,string>) {
      const out: string[] = [];
      for (let i=0; i<ids.length; i++) {
        const val = m.get(String(ids[i]));
        if (val) out.push(val);
      }
      return out;
    }

    this.pivotDs.field('issuer', {
      filterType: this.selectedIssuers.length ? 'include' : undefined,
      filterValues: this.selectedIssuers.length ? this.selectedIssuers : undefined
    });
    this.pivotDs.field('cityName', {
      filterType: this.selectedCityIds.length ? 'include' : undefined,
      filterValues: namesFrom(this.selectedCityIds, cityMap)
    });
    this.pivotDs.field('hospitalName', {
      filterType: this.selectedHospitalIds.length ? 'include' : undefined,
      filterValues: namesFrom(this.selectedHospitalIds, hospMap)
    });
    this.pivotDs.field('diagnosisCode', {
      filterType: this.selectedDiagnosisIds.length ? 'include' : undefined,
      filterValues: namesFrom(this.selectedDiagnosisIds, diagCodeMap)
    });
    this.pivotDs.field('reportStateName', {
      filterType: this.selectedStates.length ? 'include' : undefined,
      filterValues: this.selectedStates
    });
    this.pivotDs.field('decisionName', {
      filterType: this.selectedDecisionIds.length ? 'include' : undefined,
      filterValues: namesFrom(this.selectedDecisionIds, decMap)
    });

    this.pivotDs.reload();
  }

  /* ---- Kriter pilleri ---- */
  toggleColumn(kind: ColumnKey){
    const i = this.columnOrder.indexOf(kind);
    if (i >= 0) this.columnOrder.splice(i, 1);
    else { if (this.columnOrder.length === 3) this.columnOrder.shift(); this.columnOrder.push(kind); }
    this.openOnlyCriteria(kind);
    this.updatePivot();
  }
  columnRank(kind: ColumnKey){
    const i = this.columnOrder.indexOf(kind);
    return i >= 0 ? i+1 : null;
  }
}
