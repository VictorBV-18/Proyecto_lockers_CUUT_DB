import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { VerificacionQrResponse } from '../interfaces/guardia-interfaces';

@Injectable({
  providedIn: 'root',
})
export class GuardiaService {
  private API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  verificarQr(token: string): Observable<VerificacionQrResponse> {
    return this.http.get<VerificacionQrResponse>(`${this.API_URL}/guardia/verificar/${token}`);
  }
}
