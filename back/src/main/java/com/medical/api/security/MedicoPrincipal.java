package com.medical.api.security;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class MedicoPrincipal {

    private final Long medicoId;
    private final String mail;
    private final String rol;

    public boolean isAdmin() {
        return "ADMIN".equals(rol);
    }
}
