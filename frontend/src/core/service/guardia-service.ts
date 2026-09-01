import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import {
  RegistrarAccesoPayload,
  RegistrarAccesoResponse,
  VerificacionQrResponse,
} from '../interfaces/guardia-interfaces';

@Injectable({
  providedIn: 'root',
})
export class GuardiaService {
  private API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  verificarQr(token: string): Observable<VerificacionQrResponse> {
    return this.http.get<VerificacionQrResponse>(`${this.API_URL}/guardia/verificar/${token}`);
  }

  registrarAcceso(datos: RegistrarAccesoPayload): Observable<RegistrarAccesoResponse> {
    const formData = new FormData();
    formData.append('id_guardia', String(datos.id_guardia));
    formData.append('id_asignacion', String(datos.id_asignacion));
    formData.append('identidad_confirmada', String(datos.identidad_confirmada));
    formData.append('vehiculo_coincide', String(datos.vehiculo_coincide));
    if (datos.motivo) formData.append('motivo', datos.motivo);
    if (datos.evidencia) formData.append('evidencia', datos.evidencia);

    return this.http.post<RegistrarAccesoResponse>(
      `${this.API_URL}/guardia/registrar-acceso`,
      formData,
    );
  }
}
