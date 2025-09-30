// Tipler — controller projeksiyonuna bire bir uyumlu

export type Guid = string;

export interface CityDto {
  id: string;
  code: number;     // önceki: cityCode
  name: string;     // önceki: cityName
}


export interface HospitalDto {
  id: Guid;
  code: number;
  name: string;
  cityId: Guid;
}

export interface DiagnosisDto {
  id: Guid;
  code: string;
  name: string;
}

export interface HCDecisionDto {
  id: Guid;
  code: number;
  name: string;
  teminOnay: 0 | 1;
  bakanlikOnay: 0 | 1;
}

export interface FactReport {
  reportId: Guid;
  reportCode: number;
  createdDate: string;          
  reportState: number;
  reportStateName: string;

  cityId: Guid;     
  cityCode: number;     
  cityName: string;

  hospitalId: Guid; 
  hospitalCode: number; 
  hospitalName: string;
  provisionId: Guid; 
  provisionCode: string;

  diagnosisId: Guid | null;
  diagnosisCode: string | null;
  diagnosisName: string | null;

  decisionId: Guid | null;
  decisionCode: number | null;
  decisionName: string | null;

  issuer: 'MB' | 'PTM' | 'BH';
}
