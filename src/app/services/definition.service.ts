import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CityDto, DiagnosisDto, FactReport, HCDecisionDto, HospitalDto } from '../models/definition';


@Injectable({ providedIn: 'root' })
export class DefinitionService {
  // API kökü
  private url = 'https://localhost:7151/api/Definition';

  constructor(private http: HttpClient) {}

   getFact(start: string, end: string): Observable<FactReport[]> {
    return this.http.get<FactReport[]>(`${this.url}/stats/fact`, { params: { start, end } });
  }

  getCities(): Observable<CityDto[]> {
    return this.http.get<CityDto[]>(`${this.url}/cities`);
  }
  getHospitals(): Observable<HospitalDto[]> {
    return this.http.get<HospitalDto[]>(`${this.url}/hospitals`);
  }
  getDiagnoses(): Observable<DiagnosisDto[]> {
    return this.http.get<DiagnosisDto[]>(`${this.url}/diagnoses`);
  }
  getDecisions(): Observable<HCDecisionDto[]> {
    // controller: [HttpGet("hcdecisions")]
    return this.http.get<HCDecisionDto[]>(`${this.url}/hcdecisions`);
  }
  getReportStates(): Observable<string[]> {
    // controller: [HttpGet("reportstates")]
    return this.http.get<string[]>(`${this.url}/reportstates`);
  }

  issuerOf(dec: HCDecisionDto): 'MB' | 'PTM' | 'BH' {
    if (dec.bakanlikOnay === 1) return 'MB';
    if (dec.teminOnay === 1) return 'PTM';
    return 'BH';
  }
}


