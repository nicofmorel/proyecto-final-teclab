package com.medical.api.service;

import com.medical.api.dto.LoginRequest;
import com.medical.api.dto.LoginResponse;
import com.medical.api.model.Medico;
import com.medical.api.repository.MedicoRepository;
import com.medical.api.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final MedicoRepository medicoRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        Medico medico = medicoRepository.findByMail(request.getMail())
                .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas"));

        if (!medico.isActivo()) {
            throw new BadCredentialsException("Credenciales inválidas");
        }

        if (!passwordEncoder.matches(request.getPassword(), medico.getPassword())) {
            throw new BadCredentialsException("Credenciales inválidas");
        }

        String token = jwtUtil.generateToken(medico.getId(), medico.getMail(), medico.getRol().name());

        log.info("Successful login for user with rol: {}", medico.getRol().name());

        return new LoginResponse(token, medico.getId(), medico.getMail(), medico.getRol().name());
    }
}
