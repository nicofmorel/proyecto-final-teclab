package com.medical.api.dto;

import com.medical.api.model.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MedicoRequest {

    @NotBlank(message = "El nombre es requerido")
    @Size(max = 100, message = "El nombre no puede exceder 100 caracteres")
    private String nombre;

    @NotBlank(message = "El apellido es requerido")
    @Size(max = 100, message = "El apellido no puede exceder 100 caracteres")
    private String apellido;

    @NotBlank(message = "El documento es requerido")
    @Size(min = 7, max = 20, message = "El documento debe tener entre 7 y 20 caracteres")
    private String documento;

    @NotBlank(message = "La matrícula es requerida")
    @Size(max = 50, message = "La matrícula no puede exceder 50 caracteres")
    private String matricula;

    @NotBlank(message = "La especialidad es requerida")
    @Size(max = 100, message = "La especialidad no puede exceder 100 caracteres")
    private String especialidad;

    @NotBlank(message = "El mail es requerido")
    @Email(message = "El mail debe ser válido")
    private String mail;

    @Size(min = 6, max = 100, message = "La contraseña debe tener entre 6 y 100 caracteres")
    private String password;

    @NotNull(message = "El rol es requerido")
    private Rol rol;
}
