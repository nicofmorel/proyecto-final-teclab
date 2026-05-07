package com.medical.api.dto;

import com.medical.api.model.Rol;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicoResponse {

    private String id;
    private String nombre;
    private String apellido;
    private String documento;
    private String matricula;
    private String especialidad;
    private String mail;
    private Rol rol;
    private boolean activo;
}
