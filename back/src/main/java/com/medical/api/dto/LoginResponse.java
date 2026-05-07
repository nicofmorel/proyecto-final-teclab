package com.medical.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {

    private String token;
    private String tipo;
    private String medicoId;
    private String mail;
    private String rol;

    public LoginResponse(String token, String medicoId, String mail, String rol) {
        this.token = token;
        this.tipo = "Bearer";
        this.medicoId = medicoId;
        this.mail = mail;
        this.rol = rol;
    }
}
