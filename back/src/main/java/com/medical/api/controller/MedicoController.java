package com.medical.api.controller;

import com.medical.api.dto.MedicoRequest;
import com.medical.api.dto.MedicoResponse;
import com.medical.api.security.MedicoPrincipal;
import com.medical.api.service.MedicoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medicos")
@RequiredArgsConstructor
public class MedicoController {

    private final MedicoService medicoService;

    @GetMapping
    public ResponseEntity<List<MedicoResponse>> findAll() {
        return ResponseEntity.ok(medicoService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicoResponse> findById(
            @PathVariable Long id,
            @AuthenticationPrincipal MedicoPrincipal principal) {
        return ResponseEntity.ok(medicoService.findById(id, principal));
    }

    @PostMapping
    public ResponseEntity<MedicoResponse> create(@Valid @RequestBody MedicoRequest request) {
        MedicoResponse response = medicoService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicoResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody MedicoRequest request) {
        return ResponseEntity.ok(medicoService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        medicoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
