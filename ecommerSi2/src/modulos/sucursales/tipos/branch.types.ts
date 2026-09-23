export interface BranchItem {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  phone: string;
  fittingRoomsCount: number;
  gpsLocation?: string;
  coords?: {
    latitude: number;
    longitude: number;
  };
}
