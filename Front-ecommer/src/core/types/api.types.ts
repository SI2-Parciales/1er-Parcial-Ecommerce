export interface PaginatedMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface ApiErrorDetail {
  loc: string[];
  msg: string;
  type: string;
}

export interface ApiErrorResponse {
  message: string;
  statusCode: number;
  details?: ApiErrorDetail[];
}
