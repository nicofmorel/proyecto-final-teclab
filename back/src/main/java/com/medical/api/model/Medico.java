package com.medical.api.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Medico {

    private String id;
    private String nombre;
    private String apellido;
    private String documento;
    private String matricula;
    private String especialidad;
    private String mail;
    private String password;
    private Rol rol;
    private boolean activo;
}
