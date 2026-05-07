package com.medical.api.controller;

import com.medical.api.dto.EstudioRequest;
import com.medical.api.dto.EstudioResponse;
import com.medical.api.security.MedicoPrincipal;
import com.medical.api.service.EstudioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/estudios")
@RequiredArgsConstructor
public class EstudioController {

    private final EstudioService estudioService;

    @GetMapping
    public ResponseEntity<List<EstudioResponse>> findAll(
            @AuthenticationPrincipal MedicoPrincipal principal) {
        return ResponseEntity.ok(estudioService.findAll(principal));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EstudioResponse> findById(
            @PathVariable String id,
            @AuthenticationPrincipal MedicoPrincipal principal) {
        return ResponseEntity.ok(estudioService.findById(id, principal));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<EstudioResponse> create(
            @Valid @RequestPart("estudio") EstudioRequest request,
            @RequestPart(value = "archivo", required = false) MultipartFile archivo,
            @AuthenticationPrincipal MedicoPrincipal principal) {
        EstudioResponse response = estudioService.create(request, archivo, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<EstudioResponse> update(
            @PathVariable String id,
            @Valid @RequestPart("estudio") EstudioRequest request,
            @RequestPart(value = "archivo", required = false) MultipartFile archivo,
            @AuthenticationPrincipal MedicoPrincipal principal) {
        return ResponseEntity.ok(estudioService.update(id, request, archivo, principal));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable String id,
            @AuthenticationPrincipal MedicoPrincipal principal) {
        estudioService.delete(id, principal);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/archivo")
    public ResponseEntity<Resource> getArchivo(
            @PathVariable String id,
            @AuthenticationPrincipal MedicoPrincipal principal) {
        Resource resource = estudioService.getArchivoResource(id, principal);
        String contentType = estudioService.getArchivoContentType(id);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}
