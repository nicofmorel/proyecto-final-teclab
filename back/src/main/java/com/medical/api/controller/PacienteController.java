package com.medical.api.controller;

import com.medical.api.dto.PacienteRequest;
import com.medical.api.dto.PacienteResponse;
import com.medical.api.security.MedicoPrincipal;
import com.medical.api.service.PacienteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pacientes")
@RequiredArgsConstructor
public class PacienteController {

    private final PacienteService pacienteService;

    @GetMapping
    public ResponseEntity<List<PacienteResponse>> findAll(
            @AuthenticationPrincipal MedicoPrincipal principal) {
        return ResponseEntity.ok(pacienteService.findAll(principal));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PacienteResponse> findById(
            @PathVariable String id,
            @AuthenticationPrincipal MedicoPrincipal principal) {
        return ResponseEntity.ok(pacienteService.findById(id, principal));
    }

    @PostMapping
    public ResponseEntity<PacienteResponse> create(
            @Valid @RequestBody PacienteRequest request,
            @AuthenticationPrincipal MedicoPrincipal principal) {
        PacienteResponse response = pacienteService.create(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PacienteResponse> update(
            @PathVariable String id,
            @Valid @RequestBody PacienteRequest request,
            @AuthenticationPrincipal MedicoPrincipal principal) {
        return ResponseEntity.ok(pacienteService.update(id, request, principal));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String id,
            @AuthenticationPrincipal MedicoPrincipal principal) {
        pacienteService.delete(id, principal);
        return ResponseEntity.noContent().build();
    }
}
