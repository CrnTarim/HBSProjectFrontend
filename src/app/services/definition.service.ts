import { DatetimeInput, ForceDto, RankDto } from './../models/definition';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CityDto, DiagnosisDto, FactReport, HCDecisionDto, HospitalDto } from '../models/definition';

@Injectable({ providedIn: 'root' })
export class DefinitionService {
  private url = 'https://localhost:7151/api/Definition';

  constructor(private http: HttpClient) {}

  /** Flat (rapor x tanı) satırlar */
  getFact(date: DatetimeInput): Observable<FactReport[]> {
    return this.http.post<FactReport[]>(`${this.url}/stats/fact`, date);
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
    return this.http.get<HCDecisionDto[]>(`${this.url}/hcdecisions`);
  }
  getReportStates(): Observable<string[]> {
    return this.http.get<string[]>(`${this.url}/reportstates`);
  }

  getRanks(): Observable<RankDto[]> {
    return this.http.get<RankDto[]>(`${this.url}/rank`);
  }

  getForces(): Observable<ForceDto[]> {
    return this.http.get<ForceDto[]>(`${this.url}/force`);
  }

  issuerOf(dec: HCDecisionDto): 'MB' | 'PTM' | 'BH' {
    if (dec.bakanlikOnay === 1) return 'MB';
    if (dec.teminOnay === 1) return 'PTM';
    return 'BH';
  }
}
