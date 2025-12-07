export class Dispatch {

  dispatchCode?: number;
  state?: number;
  autoDispatch?: number | null;

  // HOSPITAL
  hospitalId?: string;
  hospitalCode?: number;
  hospitalName?: string;

  // FORCE
  forceId?: string;
  forceCode?: number;
  forceName?: string | null;

  // RANK
  rankId?: string;
  rankCode?: number;
  rankName?: string | null;

  // ADMISSION
  admissionId?: string;
  admissionCode?: number;
  admissionName?: string | null;

  // PERSON
  personId?: string;
  personFullName?: string | null;

  // REASON FOR EXAMINATION
  reasonforexaminationId?: string;
  reasonforexaminationCode?: number;
  reasonforexaminationName?: string | null;
}


export interface DatetimeInputDispatch {
  StartDate: string;
  EndDate: string;
}


export class DatetimeRange {
  startDate: Date | null = null;
  endDate: Date | null = null;
}

export class DispatchFilterRequest {
  datetime: DatetimeRange = new DatetimeRange();
  hospitalId: string | null = null;
  rankId: string | null = null;
  forceId: string | null = null;
  personId: string | null = null;
}

