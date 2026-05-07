package com.medical.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank(message = "El mail es requerido")
    @Email(message = "El mail debe ser válido")
    private String mail;

    @NotBlank(message = "La contraseña es requerida")
    private String password;
}
