import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Hospital, HospitalCodeName, Rank } from '../models/definition';

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

   deleteRank(id: string): Observable<string> {
     return this.http.delete<string>(`${this.url}/deleterank/${id}`);
   }

   getHospitals():Observable<Hospital[]>
   {
    return this.http.get<Hospital[]>(`${this.url}/hospitals`);   
   }

  loadHospitals(loadOptions: any) {
  return this.http.post(`${this.url}/hospitals-load`, loadOptions);
}


   postHospital(data:Hospital):Observable<Hospital>
   {
    return this.http.post<Hospital>(`${this.url}/posthospital`, data);
   }

    deleteHospital(id: string): Observable<string> {
     return this.http.delete<string>(`${this.url}/deletehospital/${id}`);
   }  

  getHospitalCityCodes(): Observable<number[]> {
    return this.http.get<number[]>(`${this.url}/hospitalcity`);
  }

  getHospitalCodeName():Observable<HospitalCodeName[]>
  {
    return this.http.get<HospitalCodeName[]>(`${this.url}/hospitalnamescodes`); 
  }

  //   getHospitalCodeNamebyCode(code:number):Observable<HospitalCodeName[]>
  // {
  //   return this.http.get<HospitalCodeName[]>(`${this.url}/hospitalnamescodes`); 
  // }

}
