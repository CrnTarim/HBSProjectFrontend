import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DatetimeInput } from '../models/statistic';
import { Observable } from 'rxjs';
import { Dispatch, DispatchFilterRequest, DispatchStateSummary, DispatchStateSummaryInput } from '../models/dispatch';

@Injectable({
  providedIn: 'root'
})
export class DispatchService {

  private url = 'https://localhost:7151/api/Dispatch';
  
    constructor(private http: HttpClient) {}
  
    getDispatch(input:DispatchFilterRequest): Observable<Dispatch[]> {
      return this.http.post<Dispatch[]>(`${this.url}/GetAllDispatchesFiltered`, input);
    }

    getDispatchSummary(input:DispatchStateSummaryInput): Observable<DispatchStateSummary[]> {
      return this.http.post<DispatchStateSummary[]>(`${this.url}/summary`, input);
    }

  
}
