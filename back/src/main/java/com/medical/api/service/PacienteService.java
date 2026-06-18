package com.medical.api.service;

import com.medical.api.dto.PacienteRequest;
import com.medical.api.dto.PacienteResponse;
import com.medical.api.exception.ResourceNotFoundException;
import com.medical.api.exception.UnauthorizedException;
import com.medical.api.model.Paciente;
import com.medical.api.repository.MedicoRepository;
import com.medical.api.repository.PacienteRepository;
import com.medical.api.security.MedicoPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PacienteService {

    private final PacienteRepository pacienteRepository;
    private final MedicoRepository medicoRepository;

    public List<PacienteResponse> findAll(MedicoPrincipal principal) {
        List<Paciente> pacientes;
        if (principal.isAdmin()) {
            pacientes = pacienteRepository.findAll();
        } else {
            pacientes = pacienteRepository.findByMedicoId(principal.getMedicoId());
        }
        return pacientes.stream()
                .filter(Paciente::isActivo)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public PacienteResponse findById(Long id, MedicoPrincipal principal) {
        Paciente paciente = pacienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paciente no encontrado"));

        checkAccess(paciente, principal);

        return toResponse(paciente);
    }

    public PacienteResponse create(PacienteRequest request, MedicoPrincipal principal) {
        Long medicoId;
        if (principal.isAdmin()) {
            if (request.getMedicoId() == null) {
                throw new IllegalArgumentException("El medicoId es requerido para ADMIN");
            }
            medicoId = Long.valueOf(request.getMedicoId());
            medicoRepository.findById(medicoId)
                    .orElseThrow(() -> new ResourceNotFoundException("Médico no encontrado"));
        } else {
            medicoId = principal.getMedicoId();
        }

        Paciente paciente = Paciente.builder()
                .nombre(request.getNombre())
                .apellido(request.getApellido())
                .fechaNacimiento(request.getFechaNacimiento())
                .mail(request.getMail())
                .telefono(request.getTelefono())
                .medicoId(medicoId)
                .activo(true)
                .build();

        pacienteRepository.save(paciente);
        log.info("Created paciente with id: {}", paciente.getId());
        return toResponse(paciente);
    }

    public PacienteResponse update(Long id, PacienteRequest request, MedicoPrincipal principal) {
        Paciente paciente = pacienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paciente no encontrado"));

        checkAccess(paciente, principal);

        paciente.setNombre(request.getNombre());
        paciente.setApellido(request.getApellido());
        paciente.setFechaNacimiento(request.getFechaNacimiento());
        paciente.setMail(request.getMail());
        paciente.setTelefono(request.getTelefono());

        // ADMIN can reassign medicoId
        if (principal.isAdmin() && request.getMedicoId() != null) {
            Long newMedicoId = Long.valueOf(request.getMedicoId());
            medicoRepository.findById(newMedicoId)
                    .orElseThrow(() -> new ResourceNotFoundException("Médico no encontrado"));
            paciente.setMedicoId(newMedicoId);
        }

        pacienteRepository.save(paciente);
        log.info("Updated paciente with id: {}", id);
        return toResponse(paciente);
    }

    public void delete(Long id, MedicoPrincipal principal) {
        Paciente paciente = pacienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paciente no encontrado"));

        checkAccess(paciente, principal);

        paciente.setActivo(false);
        pacienteRepository.save(paciente);
        log.info("Soft-deleted paciente with id: {}", id);
    }

    private void checkAccess(Paciente paciente, MedicoPrincipal principal) {
        if (!principal.isAdmin() && !principal.getMedicoId().equals(paciente.getMedicoId())) {
            throw new UnauthorizedException("Acceso denegado al paciente");
        }
    }

    private PacienteResponse toResponse(Paciente paciente) {
        return PacienteResponse.builder()
                .id(paciente.getId().toString())
                .nombre(paciente.getNombre())
                .apellido(paciente.getApellido())
                .fechaNacimiento(paciente.getFechaNacimiento())
                .mail(paciente.getMail())
                .telefono(paciente.getTelefono())
                .medicoId(paciente.getMedicoId().toString())
                .activo(paciente.isActivo())
                .build();
    }
}
