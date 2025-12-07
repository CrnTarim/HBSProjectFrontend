export class Rank
{
   id?: string;
  code?: number;
  name?: string;
  createdDate?: Date;
}

export class Hospital
{
  id?: string;
  code?: number;
  name?: string;
  cityCode?: number;
  createdDate?: Date;
}

export class HospitalCodeName
{
  code?: number;
  name?: string;
}

export class City
{
  code?: number;
  name?: string;
}

export class CreateHospital
{
  code?:number;
  name?:string;
  citycode?:number;
}