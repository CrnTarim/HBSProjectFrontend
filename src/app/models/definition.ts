export class CityDto {
  id: string = '';
  code: number = 0;
  name: string = '';
}

export class HospitalDto {
  id: string = '';
  code: number = 0;
  name: string = '';
  cityId: string = '';
}

export class DiagnosisDto {
  id: string = '';
  code: string = '';
  name: string = '';
}

export class HCDecisionDto {
  id: string = '';
  code: number = 0;
  name: string = '';
  teminOnay: 0 | 1 = 0;
  bakanlikOnay: 0 | 1 = 0;
}

export class FactReport {
  reportId: string = '';
  reportCode: number = 0;
  createdDate: string = '';

  reportState: number = 0;
  reportStateName: string = '';

  cityId: string = '';
  cityCode: number = 0;
  cityName: string = '';

  hospitalId: string = '';
  hospitalCode: number = 0;
  hospitalName: string = '';
  provisionId: string = '';
  provisionCode: string = '';

  diagnosisId: string | null = null;
  diagnosisCode: string | null = null;
  diagnosisName: string | null = null;

  decisionId: string | null = null;
  decisionCode: number | null = null;
  decisionName: string | null = null;

  issuer: 'MB' | 'PTM' | 'BH' = 'BH';
}
