import { Component, OnInit } from '@angular/core';
import PivotGridDataSource from 'devextreme/ui/pivot_grid/data_source';
import { forkJoin } from 'rxjs';
import { DefinitionService } from '../../services/definition.service';
import {
  CityDto, HospitalDto, DiagnosisDto, HCDecisionDto, FactReport
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

  /* ---- Yüzde ekseni ---- */
  percentBasis: PercentBasis = 'row';

  /* ---- Lookuplar (DOĞRUDAN DTO) ---- */
  cities: CityDto[] = [];
  hospitals: HospitalDto[] = [];
  diagnoses: DiagnosisDto[] = [];
  decisions: HCDecisionDto[] = [];
  stateNames: string[] = [];

  /* ---- Slicer seçimleri ---- */
  selectedCityIds: string[] = [];
  selectedHospitalIds: string[] = [];
  selectedDiagnosisIds: string[] = [];
  selectedDecisionIds: string[] = [];
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

  /* ---- Filtre panel bayrakları ---- */
  openCity = false; openHospital = false; openIssuer = false;
  openDiagnosis = false; openState = false; openDecision = false;

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
        this.onFetch(); // açılış
      },
      function(err){ console.error('Lookup load failed', err); }
    );
  }

  /* ================== DATE HELPERS ================== */
  private pad2(n:number){ return n<10 ? '0'+n : ''+n; }
  private toInputDate(d: Date){ return d.getFullYear() + '-' + this.pad2(d.getMonth()+1) + '-' + this.pad2(d.getDate()); }
  private initDefaultDates(){
    var end = new Date();
    var start = new Date(end.getTime() - 30*86400000);
    this.startDateStr = this.toInputDate(start);
    this.endDateStr   = this.toInputDate(end);
  }

  /* ================== DATA FETCH (FACT) ================== */
  onFetch(): void {
    if (!this.startDateStr || !this.endDateStr){
      this.factAll=[]; this.factActive=[]; this.pivotDs=null; return;
    }
    var self = this;
    this.api.getFact(this.startDateStr, this.endDateStr).subscribe(
      function(rows){
        rows = rows || [];
        self.factAll = rows.map(function(r: FactReport){
          return Object.assign({}, r, { created: new Date(r.createdDate as string) });
        });
        self.factActive = self.factAll.slice(0);
        self.updatePivot();
      },
      function(err){ console.error('getFact error', err); self.factAll=[]; self.factActive=[]; self.pivotDs=null; }
    );
  }

//     onFetch(): void {
//   if (!this.startDateStr || !this.endDateStr){
//     this.factAll=[]; this.factActive=[]; this.pivotDs=null; return;
//   }
//   this.api.getFact(this.startDateStr, this.endDateStr).subscribe(
//     rows => {
//       const data = (rows || []).map(r => ({ ...r, created: new Date(r.createdDate as string) }));
//       this.factAll = data;
//       this.factActive = data.slice();
//       this.updatePivot();
//     },
//     err => { console.error('getFact error', err); this.factAll=[]; this.factActive=[]; this.pivotDs=null; }
//   );
// }

  /* ================== UI HELPERS ================== */
  hospitalsForUI(): HospitalDto[] {
    if (!this.selectedCityIds.length) return this.hospitals;
    var s = new Set(this.selectedCityIds);
    return this.hospitals.filter(function(h){ return s.has(h.cityId as string); });
  }
  isSelected(arr: any[], id: any){ return arr.indexOf(id) !== -1; }
  private toggleIn<T>(arr: T[], v: T): T[] {
    var i = arr.indexOf(v);
    return i >= 0 ? (arr.filter(function(x){ return x !== v; }) as any) : arr.concat(v);
  }

  toggleCity(id: string){ this.selectedCityIds = this.toggleIn(this.selectedCityIds, id); this.applyFilters(); }
  toggleHospital(id: string){ this.selectedHospitalIds = this.toggleIn(this.selectedHospitalIds, id); this.applyFilters(); }
  toggleDiagnosis(id: string){ this.selectedDiagnosisIds = this.toggleIn(this.selectedDiagnosisIds, id); this.applyFilters(); }
  toggleDecision(id: string){ this.selectedDecisionIds = this.toggleIn(this.selectedDecisionIds, id); this.applyFilters(); }
  toggleState(name: string){ this.selectedStates = this.toggleIn(this.selectedStates, name); this.applyFilters(); }
  toggleIssuer(name: Issuer){ this.selectedIssuers = this.toggleIn(this.selectedIssuers, name); this.applyFilters(); }

  openOnlyRegion(which: 'City'|'Hospital'|'Issuer'){
    this.openCity     = (which === 'City')     ? !this.openCity     : false;
    this.openHospital = (which === 'Hospital') ? !this.openHospital : false;
    this.openIssuer   = (which === 'Issuer')   ? !this.openIssuer   : false;
  }
  openOnlyCriteria(which: 'Diagnosis'|'ReportState'|'Decision'){
    this.openDiagnosis = (which === 'Diagnosis')   ? !this.openDiagnosis : false;
    this.openState     = (which === 'ReportState') ? !this.openState     : false;
    this.openDecision  = (which === 'Decision')    ? !this.openDecision  : false;
  }

  public toggleRow(kind: 'Issuer'|'City'|'Hospital'){
    (this.rowSelected as any)[kind] = !(this.rowSelected as any)[kind];
    if (!this.rowSelected.Issuer && !this.rowSelected.City && !this.rowSelected.Hospital) {
      (this.rowSelected as any)[kind] = true;
    }
    this.openOnlyRegion(kind);
    this.updatePivot();
  }

  /* ================== PIVOT ================== */
  private buildFields(): any[] {
    var fields: any[] = [];

    var issuer: any = { dataField: 'issuer', caption: 'Onaylayan' };
    if (this.rowSelected.Issuer) issuer.area = 'row';
    fields.push(issuer);

    if (this.rowSelected.City)     fields.push({ dataField: 'cityName', caption: 'Şehir', area: 'row' });
    if (this.rowSelected.Hospital) fields.push({ dataField: 'hospitalName', caption: 'Hastane', area: 'row' });

    for (var i=0; i<this.columnOrder.length; i++) {
      var k = this.columnOrder[i];
      if (k === 'Diagnosis')        fields.push({ dataField: 'diagnosisName',   caption: 'Tanı',          area: 'column' });
      else if (k === 'ReportState') fields.push({ dataField: 'reportStateName', caption: 'Rapor Durumu',  area: 'column' });
      else                          fields.push({ dataField: 'decisionName',    caption: 'Karar',         area: 'column' });
    }

    fields.push({ caption: 'Rapor (count)', area: 'data', dataField: 'reportId', summaryType: 'count' });

    var mode = this.percentBasis === 'row' ? 'percentOfRowTotal'
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
    var self = this;
    setTimeout(function(){ self.applyFilters(); });
  }

  private buildNameMap(list: { id?: string; name?: string }[]): Map<string, string> {
    var m = new Map<string, string>();
    for (var i=0; i<list.length; i++) {
      var x = list[i];
      if (x && x.id && x.name) m.set(x.id, x.name);
    }
    return m;
  }

  private applyFilters(): void {
    if (!this.pivotDs) return;

    var cityMap = this.buildNameMap(this.cities);
    var hospMap = this.buildNameMap(this.hospitals);
    var diagMap = this.buildNameMap(this.diagnoses);
    var decMap  = this.buildNameMap(this.decisions);

    function namesFrom(ids: string[], m: Map<string,string>) {
      var out: string[] = [];
      for (var i=0; i<ids.length; i++) {
        var val = m.get(ids[i]);
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
    this.pivotDs.field('diagnosisName', {
      filterType: this.selectedDiagnosisIds.length ? 'include' : undefined,
      filterValues: namesFrom(this.selectedDiagnosisIds, diagMap)
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
    var i = this.columnOrder.indexOf(kind);
    if (i >= 0) this.columnOrder.splice(i, 1);
    else { if (this.columnOrder.length === 3) this.columnOrder.shift(); this.columnOrder.push(kind); }
    this.openOnlyCriteria(kind);
    this.updatePivot();
  }
  columnRank(kind: ColumnKey){ var i = this.columnOrder.indexOf(kind); return i >= 0 ? i+1 : null; }
}
