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


export class RankDto {
  id: string = '';
  code: string = '';
  name: string = '';
}

export class ForceDto {
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

/** Artık her satırda bir tanı olacağı garanti: tanı alanlarını zorunlu yaptık */
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

  forceId: string = '';
  forceCode: string = '';
  forceName: string = '';

  rankId: string = '';
  rankCode: string = '';
  rankName: string = '';

  diagnosisId: string = '';
  diagnosisCode: string = '';
  diagnosisName: string = '';

  decisionId: string = '';
  decisionCode: string = '';
  decisionName: string = '';

  /** API’de hesaplanan alan */
  issuer: 'MB' | 'PTM' | 'BH' = 'BH';
}

export interface DatetimeInput {
  StartDate: string;
  EndDate: string;
}
