import { Component, OnInit } from '@angular/core';
import PivotGridDataSource from 'devextreme/ui/pivot_grid/data_source';
import { forkJoin } from 'rxjs';
import { DefinitionService } from '../../services/definition.service';
import {
  CityDto, HospitalDto, DiagnosisDto, HCDecisionDto, FactReport,
  DatetimeInput, RankDto, ForceDto
} from '../../models/definition';

type Issuer = 'MB' | 'PTM' | 'BH';
type PercentBasis = 'row' | 'column' | 'grand';
type ColumnKey = 'Diagnosis' | 'ReportState' | 'Decision';

type FactRow = FactReport & {
  created: Date;
  diagnosisCodesCsv: string;
  diagnosesCsv: string;
  reportStateName: string;
  issuer: Issuer;
  diagSingle?: string;
};

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
  ranks: RankDto[] = [];
  forces: ForceDto[] = [];
  stateNames: string[] = [];

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

  /* ---- Slicer seçimleri ---- */
  selectedCityIds: string[] = [];
  selectedHospitalIds: string[] = [];
  selectedDiagnosisIds: string[] = []; // Tanı ID’leri
  selectedDecisionIds: string[] = [];
  selectedStates: string[] = [];
  issuers: Issuer[] = ['MB','PTM','BH'];
  selectedIssuers: Issuer[] = [];
  selectedRankIds: string[] = [];
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
  public showCount = true;
  public showDistinct = true;

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

  /* ================== HELPERS (Angular 6 uyumlu) ================== */
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
    return String(text).toLowerCase().indexOf(q.toLowerCase()) !== -1;
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
      this.factAll=[]; this.factActive=[]; this.pivotDs=null; return;
    }
    this.datetimeInput.StartDate = this.startDateStr;
    this.datetimeInput.EndDate   = this.endDateStr;

    this.api.getFact(this.datetimeInput).subscribe(
      (rows: any[]) => {
        const data: FactRow[] = (rows || []).map((r: any) => {
          const createdDateStr = this.firstDefined<string>(r.createdDate, r.CreatedDate) as string;

          // normalize alanlar (Angular 6 uyumlu)
          const normalized: any = {
            reportId:        this.firstDefined(r.reportId,        r.ReportId),
            reportCode:      this.firstDefined(r.reportCode,      r.ReportCode),
            reportState:     this.firstDefined(r.reportState,     r.ReportState),
            reportStateName: this.firstDefined(r.reportStateName, r.ReportStateName),
            cityId:          this.firstDefined(r.cityId,          r.CityId),
            cityName:        this.firstDefined(r.cityName,        r.CityName),
            hospitalId:      this.firstDefined(r.hospitalId,      r.HospitalId),
            hospitalName:    this.firstDefined(r.hospitalName,    r.HospitalName),
            provisionId:     this.firstDefined(r.provisionId,     r.ProvisionId),
            decisionId:      this.firstDefined(r.decisionId,      r.DecisionId),
            decisionName:    this.firstDefined(r.decisionName,    r.DecisionName),
            rankId:          this.firstDefined(r.rankId,          r.RankId),
            rankName:        this.firstDefined(r.rankName,        r.RankName),
            forceId:         this.firstDefined(r.forceId,         r.ForceId),
            forceName:       this.firstDefined(r.forceName,       r.ForceName),
            diagnosisCodesCsv: (this.firstDefined(r.diagnosisCodesCsv, r.DiagnosisCodesCsv) || '') as string,
            diagnosesCsv:      (this.firstDefined(r.diagnosesCsv,      r.DiagnosesCsv)      || '') as string,
            issuer:            (this.firstDefined(r.issuer, r.Issuer) || 'BH') as Issuer,
            createdDate: createdDateStr,
            created: new Date(createdDateStr)
          };

          // orijinaliyle birleştir (Object.assign Angular 6 için güvenli)
          return Object.assign({}, r, normalized) as FactRow;
        });

        this.factAll = data;
        this.applyFilters(true);
      },
      err => { console.error('getFact error', err); this.factAll=[]; this.factActive=[]; this.pivotDs=null; }
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
  toggleDiagnosis(id: any)  { this.selectedDiagnosisIds = this.toggleIn(this.selectedDiagnosisIds, id);  this.applyFilters(); }
  toggleDecision(id: any)   { this.selectedDecisionIds  = this.toggleIn(this.selectedDecisionIds, id);   this.applyFilters(); }
  toggleState(name: string) { this.selectedStates       = this.toggleIn(this.selectedStates, name);      this.applyFilters(); }
  toggleIssuer(name: Issuer){ this.selectedIssuers      = this.toggleIn(this.selectedIssuers, name);     this.applyFilters(); }
  toggleRank(id: any)       { this.selectedRankIds      = this.toggleIn(this.selectedRankIds, id);       this.applyFilters(); }
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
  public toggleRow(kind: 'Issuer' | 'City' | 'Hospital' | 'Rank' | 'Force') {
    (this.rowSelected as any)[kind] = !(this.rowSelected as any)[kind];
    if (!this.rowSelected.Issuer && !this.rowSelected.City && !this.rowSelected.Hospital && !this.rowSelected.Force && !this.rowSelected.Rank) {
      (this.rowSelected as any)[kind] = true;
    }
    this.openOnlyRegion(kind);
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
      fields.push({ dataField: 'forceName', caption: 'Kuvvet', area: 'row' });
    }
    if (this.rowSelected.Rank) {
      fields.push({ dataField: 'rankName', caption: 'Rütbe', area: 'row' });
    }
    if (this.rowSelected.City) {
      fields.push({ dataField: 'cityName', caption: 'Şehir', area: 'row' });
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

    // ---- Veri alanları ----
    fields.push({
      name: 'cntRows',
      caption: 'Rapor (count)',
      area: 'data',
      dataField: 'reportId',
      summaryType: 'count',
      visible: this.showCount
    });

    fields.push({
      name: 'cntDistinctReports',
      caption: 'Rapor (distinct)',
      area: 'data',
      dataField: 'reportId',
      summaryType: 'custom',
      calculateCustomSummary: (o:any) => this.calcDistinctReport(o),
      visible: this.showDistinct
    });

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
      const id = o.value != null ? String(o.value) : '';
      if (id) o._set.add(id);
    } else if (o.summaryProcess === 'finalize') {
      o.totalValue = o._set.size;
    }
  }

  /* ================== FİLTRE & SANAL PATLATMA ================== */
  private applyFilters(initial = false): void {
    // Seçili tanı ID → kod seti
    const selectedDiagCodes = new Set(
      this.diagnoses
        .filter(d => this.selectedDiagnosisIds.indexOf(String(d.id)) !== -1)
        .map(d => String(d.code))
    );

    const selCity     = new Set(this.selectedCityIds.map(String));
    const selHosp     = new Set(this.selectedHospitalIds.map(String));
    const selState    = new Set(this.selectedStates.map(String));
    const selIssuer   = new Set(this.selectedIssuers.map(String));
    const selDecision = new Set(this.selectedDecisionIds.map(String));
    const selRank     = new Set(this.selectedRankIds.map(String));
    const selForce    = new Set(this.selectedForceIds.map(String));

    const diagnosisInColumns = this.columnOrder.indexOf('Diagnosis') !== -1;

    let prepared: FactRow[] = [];

    for (let idx = 0; idx < this.factAll.length; idx++) {
      const r = this.factAll[idx];
      const reportCodesSet = new Set(this._codes(r.diagnosisCodesCsv));
      const reportCodesArr = Array.from(reportCodesSet);

      if (diagnosisInColumns && selectedDiagCodes.size) {
        let pushed = false;
        Array.from(selectedDiagCodes).forEach(code => {
          if (reportCodesSet.has(code)) {
            prepared.push(Object.assign({}, r, { diagSingle: code }));
            pushed = true;
          }
        });
        if (!pushed) {
          // seçili tanılardan hiçbiri yoksa, at
        }
      } else if (diagnosisInColumns && !selectedDiagCodes.size) {
        if (reportCodesArr.length > 0) {
          for (let j = 0; j < reportCodesArr.length; j++) {
            prepared.push(Object.assign({}, r, { diagSingle: reportCodesArr[j] }));
          }
        } else {
          prepared.push(Object.assign({}, r, { diagSingle: '(Tanısız)' }));
        }
      } else {
        prepared.push(r);
      }
    }

    // Diğer slicer filtreleri
    const filtered = prepared.filter(r => {
      if (selIssuer.size   && !selIssuer.has(String(r.issuer))) return false;
      if (selCity.size     && !selCity.has(String(r.cityId))) return false;
      if (selHosp.size     && !selHosp.has(String(r.hospitalId))) return false;
      if (selRank.size     && (!r.rankId || !selRank.has(String(r.rankId)))) return false;
      if (selForce.size    && (!r.forceId || !selForce.has(String(r.forceId)))) return false;
      if (selState.size    && !selState.has(String(r.reportStateName))) return false;
      if (selDecision.size && (!r.decisionId || !selDecision.has(String(r.decisionId)))) return false;
      return true;
    });

    this.factActive = filtered;
    this.updatePivot();
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
}
