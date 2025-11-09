import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Rank } from '../models/definition';

@Injectable({
  providedIn: 'root'
})
export class HosdefinitionService {

   private url = "https://localhost:7151/api/Definition";  // API endpoint'i
    
      constructor(private http: HttpClient) { }
    
    getRanks():Observable<Rank[]>{
      return this.http.get<Rank[]>(`${this.url}/ranks`);    
    }

 postRank(data: Rank): Observable<Rank> {
    return this.http.post<Rank>(`${this.url}/postrank`, data);
  }
}
