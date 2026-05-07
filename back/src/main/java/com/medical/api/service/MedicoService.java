package com.medical.api.service;

import com.medical.api.dto.MedicoRequest;
import com.medical.api.dto.MedicoResponse;
import com.medical.api.exception.ResourceNotFoundException;
import com.medical.api.exception.UnauthorizedException;
import com.medical.api.model.Medico;
import com.medical.api.repository.MedicoRepository;
import com.medical.api.security.MedicoPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MedicoService {

    private final MedicoRepository medicoRepository;
    private final PasswordEncoder passwordEncoder;

    public List<MedicoResponse> findAll() {
        return medicoRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public MedicoResponse findById(String id, MedicoPrincipal principal) {
        // ADMIN can access any; MEDICO can only access self
        if (!principal.isAdmin() && !principal.getMedicoId().equals(id)) {
            throw new UnauthorizedException("Acceso denegado");
        }

        Medico medico = medicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Médico no encontrado"));

        return toResponse(medico);
    }

    public MedicoResponse create(MedicoRequest request) {
        if (medicoRepository.existsByMail(request.getMail())) {
            throw new IllegalArgumentException("Ya existe un médico con ese mail");
        }
        if (medicoRepository.existsByDocumento(request.getDocumento())) {
            throw new IllegalArgumentException("Ya existe un médico con ese documento");
        }
        if (medicoRepository.existsByMatricula(request.getMatricula())) {
            throw new IllegalArgumentException("Ya existe un médico con esa matrícula");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("La contraseña es requerida para crear un médico");
        }

        Medico medico = Medico.builder()
                .id(UUID.randomUUID().toString())
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .documento(request.getDocumento())
                .matricula(request.getMatricula())
                .especialidad(request.getEspecialidad())
                .mail(request.getMail())
                .password(passwordEncoder.encode(request.getPassword()))
                .rol(request.getRol())
                .activo(true)
                .build();

        medicoRepository.save(medico);
        log.info("Created new medico with id: {}", medico.getId());
        return toResponse(medico);
    }

    public MedicoResponse update(String id, MedicoRequest request) {
        Medico existing = medicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Médico no encontrado"));

        // Check mail uniqueness (excluding self)
        medicoRepository.findByMail(request.getMail())
                .filter(m -> !m.getId().equals(id))
                .ifPresent(m -> {
                    throw new IllegalArgumentException("Ya existe un médico con ese mail");
                });

        existing.setNombre(request.getNombre());
        existing.setApellido(request.getApellido());
        existing.setDocumento(request.getDocumento());
        existing.setMatricula(request.getMatricula());
        existing.setEspecialidad(request.getEspecialidad());
        existing.setMail(request.getMail());
        existing.setRol(request.getRol());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            existing.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        medicoRepository.save(existing);
        log.info("Updated medico with id: {}", id);
        return toResponse(existing);
    }

    public void delete(String id) {
        Medico medico = medicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Médico no encontrado"));

        medico.setActivo(false);
        medicoRepository.save(medico);
        log.info("Soft-deleted medico with id: {}", id);
    }

    private MedicoResponse toResponse(Medico medico) {
        return MedicoResponse.builder()
                .id(medico.getId())
                .nombre(medico.getNombre())
                .apellido(medico.getApellido())
                .documento(medico.getDocumento())
                .matricula(medico.getMatricula())
                .especialidad(medico.getEspecialidad())
                .mail(medico.getMail())
                .rol(medico.getRol())
                .activo(medico.isActivo())
                .build();
    }
}
