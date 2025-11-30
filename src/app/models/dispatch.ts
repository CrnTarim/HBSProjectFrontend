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
