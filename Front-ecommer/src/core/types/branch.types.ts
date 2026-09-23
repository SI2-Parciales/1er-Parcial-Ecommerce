export interface City {
  id: string;
  name: string;
  department: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  city: string;
  fittingRooms: number;
  location?: string;
  isActive: boolean;
}

export interface BranchFormValues {
  name: string;
  code: string;
  address: string;
  phone: string;
  city: string;
  fittingRooms: number;
  isActive: boolean;
}

