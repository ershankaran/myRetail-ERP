export interface ApiResponse<T> {
  status: 'SUCCESS' | 'ERROR';
  message: string;
  data: T;
  errors?: string[];
  timestamp: string;
}
