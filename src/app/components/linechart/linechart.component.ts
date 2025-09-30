import { Component, OnInit } from '@angular/core';
import PivotGridDataSource from 'devextreme/ui/pivot_grid/data_source';
import { forkJoin } from 'rxjs';
import {
  DefinitionService, FactReport, CityDto, HospitalDto, DiagnosisDto, HCDecisionDto
} from '../../services/definition.service';

type Issuer = 'MB' | 'PTM' | 'BH';
type PercentBasis = 'row' | 'column' | 'grand';
type ColumnKey = 'Diagnosis' | 'ReportState' | 'Decision';

interface CityUI { id:string; name:string; code:number; }
interface HospUI { id:string; name:string; code:number; cityId:string; }
interface DiagUI { id:string; name:string; code:string; }
interface DecUI  { id:string; name:string; code:number; issuer:Issuer; }

@Component({
  selector: 'app-linechart',
  templateUrl: './linechart.component.html',
  styleUrls: ['./linechart.component.css']
})
export class LinechartComponent implements OnInit {

  constructor(private api: DefinitionService) {}

  // tarih
  startDateStr = '';
  endDateStr   = '';

  // yüzdeler
  percentBasis: PercentBasis = 'row';

  // lookuplar (UI)
  cities: CityUI[] = [];
  hospitals: HospUI[] = [];
  diagnoses: DiagUI[] = [];
  decisions: DecUI[] = [];
  stateNames: string[] = [];

  // slicer seçimleri
  selectedCityIds: string[] = [];
  selectedHospitalIds: string[] = [];
  selectedDiagnosisIds: string[] = [];
  selectedDecisionIds: string[] = [];
  selectedStates: string[] = [];
  issuers: Issuer[] = ['MB','PTM','BH'];
  selectedIssuers: Issuer[] = [];

  // data
  private factAll: (FactReport & { created: Date })[] = [];
  factActive: (FactReport & { created: Date })[] = [];

  // pivot
  pivotDs: any = null;

  // kolon sırası
  columnOrder: ColumnKey[] = [];

  // satır alanları
  public rowSelected = { Issuer: false, City: true, Hospital: false };

  // paneller
  openRegionFilters = false;
  openCriteriaFilters = false;

  ngOnInit(): void {
    this.initDefaultDates();

    // lookup’ları çek
    forkJoin({
      cities:    this.api.getCities(),
      hospitals: this.api.getHospitals(),
      diagnoses: this.api.getDiagnoses(),
      decisions: this.api.getDecisions(),
      states:    this.api.getReportStates()
    }).subscribe({
      next: ({ cities, hospitals, diagnoses, decisions, states }) => {
        // controller property adlarına göre map
       this.cities = cities.map(c => ({
          id: c.id,
          name: c.name,   // önceki: c.cityName
          code: c.code    // önceki: c.cityCode
        }));

        this.hospitals = hospitals.map((h: HospitalDto) => ({
          id: h.id, name: h.name, code: h.code, cityId: h.cityId
        }));
        this.diagnoses = diagnoses.map((d: DiagnosisDto) => ({
          id: d.id, name: d.name, code: d.code
        }));
        this.decisions = decisions.map((k: HCDecisionDto) => ({
          id: k.id, name: k.name, code: k.code, issuer: this.api.issuerOf(k)
        }));
        this.stateNames = states;

        // Açılışta son 30 günü getir
        this.onFetch();
      },
      error: err => console.error('Lookup load failed', err)
    });
  }

  // tarih yardımcıları
  private pad2(n:number){ return n<10 ? '0'+n : ''+n; }
  private toInputDate(d: Date){ return `${d.getFullYear()}-${this.pad2(d.getMonth()+1)}-${this.pad2(d.getDate())}`; }
  private initDefaultDates(){
    const end = new Date();
    const start = new Date(end.getTime() - 30*86400000);
    this.startDateStr = this.toInputDate(start);
    this.endDateStr   = this.toInputDate(end);
  }

  // fact çek
  onFetch(): void {
    if (!this.startDateStr || !this.endDateStr){
      this.factAll=[]; this.factActive=[]; this.pivotDs=null; return;
    }
    this.api.getFact(this.startDateStr, this.endDateStr).subscribe({
      next: rows => {
        this.factAll = (rows || []).map(r => ({ ...r, created: new Date(r.createdDate) }));
        this.factActive = [...this.factAll];
        this.updatePivot();
      },
      error: err => { console.error('getFact error', err); this.factActive=[]; this.pivotDs=null; }
    });
  }

  // UI helpers
  hospitalsForUI(): HospUI[] {
    if (!this.selectedCityIds.length) return this.hospitals;
    const s = new Set(this.selectedCityIds);
    return this.hospitals.filter(h => s.has(h.cityId));
  }
  isSelected(arr: any[], id: any){ return arr.indexOf(id) !== -1; }
  private toggleIn<T>(arr: T[], v: T): T[] {
    const i = arr.indexOf(v);
    return i >= 0 ? arr.filter(x => x !== v) : arr.concat(v);
  }
  toggleCity(id: string){ this.selectedCityIds = this.toggleIn(this.selectedCityIds, id); this.applyFilters(); }
  toggleHospital(id: string){ this.selectedHospitalIds = this.toggleIn(this.selectedHospitalIds, id); this.applyFilters(); }
  toggleDiagnosis(id: string){ this.selectedDiagnosisIds = this.toggleIn(this.selectedDiagnosisIds, id); this.applyFilters(); }
  toggleDecision(id: string){ this.selectedDecisionIds = this.toggleIn(this.selectedDecisionIds, id); this.applyFilters(); }
  toggleState(name: string){ this.selectedStates = this.toggleIn(this.selectedStates, name); this.applyFilters(); }
  toggleIssuer(name: Issuer){ this.selectedIssuers = this.toggleIn(this.selectedIssuers, name); this.applyFilters(); }

  public toggleRow(kind: 'Issuer'|'City'|'Hospital'){
    (this.rowSelected as any)[kind] = !(this.rowSelected as any)[kind];
    if (!this.rowSelected.Issuer && !this.rowSelected.City && !this.rowSelected.Hospital) {
      (this.rowSelected as any)[kind] = true;
    }
    this.updatePivot();
  }

  // pivot
  private buildFields(): any[] {
    const fields: any[] = [];

    const issuer: any = { dataField: 'issuer', caption: 'Onaylayan' };
    if (this.rowSelected.Issuer) issuer.area = 'row';
    fields.push(issuer);

    if (this.rowSelected.City)     fields.push({ dataField: 'cityName', caption: 'Şehir', area: 'row' });
    if (this.rowSelected.Hospital) fields.push({ dataField: 'hospitalName', caption: 'Hastane', area: 'row' });

    for (const k of this.columnOrder) {
      if (k === 'Diagnosis')      fields.push({ dataField: 'diagnosisName',   caption: 'Tanı',          area: 'column' });
      else if (k === 'ReportState') fields.push({ dataField: 'reportStateName', caption: 'Rapor Durumu', area: 'column' });
      else                        fields.push({ dataField: 'decisionName',    caption: 'Karar',         area: 'column' });
    }

    fields.push({ caption: 'Rapor (count)', area: 'data', dataField: 'reportId', summaryType: 'count' });

    const mode = this.percentBasis === 'row' ? 'percentOfRowTotal'
              : this.percentBasis === 'column' ? 'percentOfColumnTotal'
              : 'percentOfGrandTotal';
    fields.push({
      caption: 'Oran', area: 'data', dataField: 'reportId', summaryType: 'count',
      summaryDisplayMode: mode, format: { type: 'percent', precision: 2 }
    });

    return fields;
  }

  public updatePivot(): void {
    if (!this.factActive.length){ this.pivotDs=null; return; }
    this.pivotDs = new PivotGridDataSource({ fields: this.buildFields(), store: this.factActive });
    setTimeout(() => this.applyFilters());
  }

  private applyFilters(): void {
    if (!this.pivotDs) return;

    const mapNames = (arr: {id:string; name:string}[]) => new Map(arr.map(x => [x.id, x.name]));
    const cityMap = mapNames(this.cities);
    const hospMap = mapNames(this.hospitals);
    const diagMap = mapNames(this.diagnoses);
    const decMap  = mapNames(this.decisions);

    const names = (ids: string[], m: Map<string,string>) => ids.map(id => m.get(id)).filter(Boolean) as string[];

    this.pivotDs.field('issuer', {
      filterType: this.selectedIssuers.length ? 'include' : undefined,
      filterValues: this.selectedIssuers.length ? this.selectedIssuers : undefined
    });
    this.pivotDs.field('cityName', {
      filterType: this.selectedCityIds.length ? 'include' : undefined,
      filterValues: names(this.selectedCityIds, cityMap)
    });
    this.pivotDs.field('hospitalName', {
      filterType: this.selectedHospitalIds.length ? 'include' : undefined,
      filterValues: names(this.selectedHospitalIds, hospMap)
    });
    this.pivotDs.field('diagnosisName', {
      filterType: this.selectedDiagnosisIds.length ? 'include' : undefined,
      filterValues: names(this.selectedDiagnosisIds, diagMap)
    });
    this.pivotDs.field('reportStateName', {
      filterType: this.selectedStates.length ? 'include' : undefined,
      filterValues: this.selectedStates
    });
    this.pivotDs.field('decisionName', {
      filterType: this.selectedDecisionIds.length ? 'include' : undefined,
      filterValues: names(this.selectedDecisionIds, decMap)
    });

    this.pivotDs.reload();
  }

  // kolon butonları
  toggleColumn(kind: ColumnKey){
    const i = this.columnOrder.indexOf(kind);
    if (i >= 0) this.columnOrder.splice(i, 1);
    else { if (this.columnOrder.length === 3) this.columnOrder.shift(); this.columnOrder.push(kind); }
    this.updatePivot();
  }
  columnRank(kind: ColumnKey){ const i = this.columnOrder.indexOf(kind); return i >= 0 ? i+1 : null; }
}
