package com.medical.api.service;

import com.medical.api.dto.EstudioRequest;
import com.medical.api.dto.EstudioResponse;
import com.medical.api.exception.ResourceNotFoundException;
import com.medical.api.exception.UnauthorizedException;
import com.medical.api.model.Estudio;
import com.medical.api.model.TipoEstudio;
import com.medical.api.repository.EstudioRepository;
import com.medical.api.repository.MedicoRepository;
import com.medical.api.repository.PacienteRepository;
import com.medical.api.security.MedicoPrincipal;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EstudioService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "jpg", "jpeg", "png");
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png"
    );
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Map<TipoEstudio, List<String>> DETAIL_KEYS = Map.of(
            TipoEstudio.RADIOGRAFIA, List.of("regionAnatomica", "lateralidad", "proyeccion", "contraste"),
            TipoEstudio.ECOGRAFIA, List.of("zonaEstudio", "ayuno", "via", "hallazgos"),
            TipoEstudio.LABORATORIO, List.of("muestra", "panel", "ayuno", "prioridad"),
            TipoEstudio.TOMOGRAFIA, List.of("region", "contraste", "sedacion", "observacionesTecnicas")
    );

    private final EstudioRepository estudioRepository;
    private final MedicoRepository medicoRepository;
    private final PacienteRepository pacienteRepository;

    @Value("${app.upload.path:./uploads}")
    private String uploadBasePath;

    public List<EstudioResponse> findAll(MedicoPrincipal principal) {
        List<Estudio> estudios;
        if (principal.isAdmin()) {
            estudios = estudioRepository.findAll();
        } else {
            estudios = estudioRepository.findByMedicoId(principal.getMedicoId());
        }
        return estudios.stream()
                .filter(Estudio::isActivo)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public EstudioResponse findById(Long id, MedicoPrincipal principal) {
        Estudio estudio = estudioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Estudio no encontrado"));

        checkAccess(estudio, principal);
        return toResponse(estudio);
    }

    public EstudioResponse create(EstudioRequest request, MultipartFile file, MedicoPrincipal principal) {
        TipoEstudio tipoEstudio = parseTipoEstudio(request.getTipoEstudio());
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

        pacienteRepository.findById(Long.valueOf(request.getPacienteId()))
                .orElseThrow(() -> new ResourceNotFoundException("Paciente no encontrado"));

        String archivoPath = null;
        if (file != null && !file.isEmpty()) {
            archivoPath = saveFile(file);
        }

        String detalles = normalizeDetalles(tipoEstudio, request.getDetalles());
        String codigoEstudio = resolveCodigoEstudioForCreate(request.getCodigoEstudio(), tipoEstudio);

        Estudio estudio = Estudio.builder()
                .fecha(request.getFecha())
                .nombre(request.getNombre())
                .observaciones(request.getObservaciones())
                .pacienteId(Long.valueOf(request.getPacienteId()))
                .medicoId(medicoId)
                .archivoPath(archivoPath)
                .tipoEstudio(tipoEstudio)
                .complejidad(parseComplejidad(request.getComplejidad()))
                .codigoEstudio(codigoEstudio)
                .detalles(detalles)
                .activo(true)
                .build();

        estudioRepository.save(estudio);
        log.info("Created estudio with id: {}", estudio.getId());
        return toResponse(estudio);
    }

    public EstudioResponse update(Long id, EstudioRequest request, MultipartFile file, MedicoPrincipal principal) {
        Estudio estudio = estudioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Estudio no encontrado"));

        checkAccess(estudio, principal);
        TipoEstudio tipoEstudio = parseTipoEstudio(request.getTipoEstudio());

        pacienteRepository.findById(Long.valueOf(request.getPacienteId()))
                .orElseThrow(() -> new ResourceNotFoundException("Paciente no encontrado"));

        estudio.setFecha(request.getFecha());
        estudio.setNombre(request.getNombre());
        estudio.setObservaciones(request.getObservaciones());
        estudio.setPacienteId(Long.valueOf(request.getPacienteId()));
        estudio.setTipoEstudio(tipoEstudio);
        estudio.setComplejidad(parseComplejidad(request.getComplejidad()));
        String detalles = normalizeDetalles(tipoEstudio, request.getDetalles());
        estudio.setDetalles(detalles);

        if (principal.isAdmin() && request.getMedicoId() != null) {
            Long newMedicoId = Long.valueOf(request.getMedicoId());
            medicoRepository.findById(newMedicoId)
                    .orElseThrow(() -> new ResourceNotFoundException("Médico no encontrado"));
            estudio.setMedicoId(newMedicoId);
        }

        String codigoEstudio = resolveCodigoEstudioForUpdate(request.getCodigoEstudio(), estudio.getCodigoEstudio());
        estudio.setCodigoEstudio(codigoEstudio);

        if (file != null && !file.isEmpty()) {
            // Delete old file if present
            if (estudio.getArchivoPath() != null) {
                deleteFile(estudio.getArchivoPath());
            }
            estudio.setArchivoPath(saveFile(file));
        }

        estudioRepository.save(estudio);
        log.info("Updated estudio with id: {}", id);
        return toResponse(estudio);
    }

    public void delete(Long id, MedicoPrincipal principal) {
        Estudio estudio = estudioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Estudio no encontrado"));

        checkAccess(estudio, principal);

        estudio.setActivo(false);
        estudioRepository.save(estudio);
        log.info("Soft-deleted estudio with id: {}", id);
    }

    public Resource getArchivoResource(Long id, MedicoPrincipal principal) {
        Estudio estudio = estudioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Estudio no encontrado"));

        checkAccess(estudio, principal);

        if (estudio.getArchivoPath() == null) {
            throw new ResourceNotFoundException("El estudio no tiene archivo adjunto");
        }

        try {
            Path filePath = Paths.get(uploadBasePath).resolve(estudio.getArchivoPath()).normalize();
            // Prevent path traversal: ensure file is within upload directory
            Path uploadDir = Paths.get(uploadBasePath).toAbsolutePath().normalize();
            if (!filePath.toAbsolutePath().normalize().startsWith(uploadDir)) {
                throw new UnauthorizedException("Acceso denegado al archivo");
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResourceNotFoundException("Archivo no encontrado o no legible");
            }
            return resource;
        } catch (IOException e) {
            log.error("Error accessing file for estudio id: {}", id);
            throw new RuntimeException("Error al acceder al archivo");
        }
    }

    public String getArchivoContentType(Long id) {
        Estudio estudio = estudioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Estudio no encontrado"));

        if (estudio.getArchivoPath() == null) {
            return "application/octet-stream";
        }

        String filename = estudio.getArchivoPath();
        String ext = getExtension(filename).toLowerCase();
        return switch (ext) {
            case "pdf" -> "application/pdf";
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            default -> "application/octet-stream";
        };
    }

    private String saveFile(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new IllegalArgumentException("Nombre de archivo inválido");
        }

        // Sanitize filename - prevent path traversal
        String sanitized = Paths.get(originalFilename).getFileName().toString()
                .replaceAll("[^a-zA-Z0-9._-]", "_");

        String ext = getExtension(sanitized).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Tipo de archivo no permitido. Solo se aceptan: pdf, jpg, jpeg, png");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("El archivo excede el tamaño máximo de 10MB");
        }

        // Validate MIME type
        try {
            Tika tika = new Tika();
            String mimeType = tika.detect(file.getInputStream());
            if (!ALLOWED_MIME_TYPES.contains(mimeType)) {
                throw new IllegalArgumentException("Tipo MIME no permitido: " + mimeType);
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("No se pudo verificar el tipo del archivo");
        }

        try {
            Path uploadDir = Paths.get(uploadBasePath);
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            String storedFilename = UUID.randomUUID().toString() + "." + ext;
            Path destination = uploadDir.resolve(storedFilename).normalize();

            // Double-check path traversal
            if (!destination.toAbsolutePath().startsWith(uploadDir.toAbsolutePath().normalize())) {
                throw new IllegalArgumentException("Nombre de archivo inválido");
            }

            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            log.info("Saved file: {}", storedFilename);
            return storedFilename;
        } catch (IOException e) {
            log.error("Error saving file");
            throw new RuntimeException("Error al guardar el archivo");
        }
    }

    private void deleteFile(String filename) {
        try {
            Path filePath = Paths.get(uploadBasePath).resolve(filename).normalize();
            Path uploadDir = Paths.get(uploadBasePath).toAbsolutePath().normalize();
            if (filePath.toAbsolutePath().startsWith(uploadDir)) {
                Files.deleteIfExists(filePath);
            }
        } catch (IOException e) {
            log.warn("Could not delete file: {}", filename);
        }
    }

    private String getExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        if (lastDot < 0 || lastDot == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastDot + 1);
    }

    private void checkAccess(Estudio estudio, MedicoPrincipal principal) {
        if (!principal.isAdmin() && !principal.getMedicoId().equals(estudio.getMedicoId())) {
            throw new UnauthorizedException("Acceso denegado al estudio");
        }
    }

    private EstudioResponse toResponse(Estudio estudio) {
        return EstudioResponse.builder()
                .id(estudio.getId().toString())
                .fecha(estudio.getFecha())
                .nombre(estudio.getNombre())
                .observaciones(estudio.getObservaciones())
                .pacienteId(estudio.getPacienteId().toString())
                .medicoId(estudio.getMedicoId().toString())
                .tipoEstudio(estudio.getTipoEstudio() != null ? estudio.getTipoEstudio().name() : null)
                .complejidad(estudio.getComplejidad() != null ? estudio.getComplejidad().name() : null)
                .codigoEstudio(estudio.getCodigoEstudio())
                .detalles(parseStoredDetalles(estudio.getDetalles()))
                .tieneArchivo(estudio.getArchivoPath() != null)
                .activo(estudio.isActivo())
                .build();
    }

    private TipoEstudio parseTipoEstudio(String tipoEstudio) {
        if (tipoEstudio == null || tipoEstudio.isBlank()) {
            throw new IllegalArgumentException("El tipo de estudio es requerido");
        }
        try {
            return TipoEstudio.valueOf(tipoEstudio.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Tipo de estudio inválido: " + tipoEstudio);
        }
    }

    private com.medical.api.model.Complejidad parseComplejidad(String complejidad) {
        if (complejidad == null || complejidad.isBlank()) {
            throw new IllegalArgumentException("La complejidad es requerida");
        }
        try {
            return com.medical.api.model.Complejidad.valueOf(complejidad.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Complejidad inválida: " + complejidad);
        }
    }

    private String resolveCodigoEstudioForCreate(String codigoEstudio, TipoEstudio tipoEstudio) {
        if (codigoEstudio != null && !codigoEstudio.isBlank()) {
            return codigoEstudio.trim();
        }

        String prefix = switch (tipoEstudio) {
            case GENERICO -> "GEN";
            case RADIOGRAFIA -> "RX";
            case ECOGRAFIA -> "ECO";
            case LABORATORIO -> "LAB";
            case TOMOGRAFIA -> "TAC";
        };
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private String resolveCodigoEstudioForUpdate(String codigoEstudio, String currentCodigoEstudio) {
        if (codigoEstudio != null && !codigoEstudio.isBlank()) {
            return codigoEstudio.trim();
        }
        return currentCodigoEstudio;
    }

    private String normalizeDetalles(TipoEstudio tipoEstudio, JsonNode rawDetalles) {
        JsonNode detailsNode = parseDetailsNode(rawDetalles);

        if (tipoEstudio == TipoEstudio.GENERICO) {
            return detailsNode == null ? null : writeJson(detailsNode);
        }

        if (detailsNode == null || !detailsNode.isObject()) {
            throw new IllegalArgumentException("Los detalles específicos deben ser un JSON válido");
        }

        validateSpecificDetails(tipoEstudio, detailsNode);
        ObjectNode normalized = OBJECT_MAPPER.createObjectNode();
        for (String key : DETAIL_KEYS.getOrDefault(tipoEstudio, List.of())) {
            normalized.set(key, detailsNode.get(key));
        }
        return writeJson(normalized);
    }

    private JsonNode parseStoredDetalles(String detalles) {
        if (detalles == null || detalles.isBlank()) {
            return null;
        }
        try {
            return OBJECT_MAPPER.readTree(detalles);
        } catch (IOException e) {
            throw new IllegalStateException("Los detalles almacenados tienen un formato inválido", e);
        }
    }

    private JsonNode parseDetailsNode(JsonNode rawDetalles) {
        if (rawDetalles == null || rawDetalles.isNull()) {
            return null;
        }
        if (rawDetalles.isTextual()) {
            String text = rawDetalles.asText();
            if (text.isBlank()) {
                return null;
            }
            try {
                return OBJECT_MAPPER.readTree(text);
            } catch (IOException e) {
                throw new IllegalArgumentException("Los detalles específicos deben ser un JSON válido");
            }
        }
        return rawDetalles;
    }

    private String writeJson(JsonNode node) {
        try {
            return OBJECT_MAPPER.writeValueAsString(node);
        } catch (IOException e) {
            throw new IllegalStateException("No se pudieron normalizar los detalles", e);
        }
    }

    private void validateSpecificDetails(TipoEstudio tipoEstudio, JsonNode detailsNode) {
        switch (tipoEstudio) {
            case RADIOGRAFIA -> {
                requireDetail(detailsNode, "regionAnatomica", tipoEstudio, "la región anatómica");
                requireDetail(detailsNode, "lateralidad", tipoEstudio, "la lateralidad");
                requireDetail(detailsNode, "proyeccion", tipoEstudio, "la proyección");
                requireDetail(detailsNode, "contraste", tipoEstudio, "el contraste");
            }
            case ECOGRAFIA -> {
                requireDetail(detailsNode, "zonaEstudio", tipoEstudio, "la zona estudiada");
                requireDetail(detailsNode, "ayuno", tipoEstudio, "el ayuno previo");
                requireDetail(detailsNode, "via", tipoEstudio, "la vía de estudio");
                requireDetail(detailsNode, "hallazgos", tipoEstudio, "los hallazgos");
            }
            case LABORATORIO -> {
                requireDetail(detailsNode, "muestra", tipoEstudio, "la muestra");
                requireDetail(detailsNode, "panel", tipoEstudio, "el panel o análisis");
                requireDetail(detailsNode, "ayuno", tipoEstudio, "el ayuno previo");
                requireDetail(detailsNode, "prioridad", tipoEstudio, "la prioridad");
            }
            case TOMOGRAFIA -> {
                requireDetail(detailsNode, "region", tipoEstudio, "la región estudiada");
                requireDetail(detailsNode, "contraste", tipoEstudio, "el contraste");
                requireDetail(detailsNode, "sedacion", tipoEstudio, "la sedación");
                requireDetail(detailsNode, "observacionesTecnicas", tipoEstudio, "las observaciones técnicas");
            }
            default -> {
            }
        }
    }

    private void requireDetail(JsonNode node, String key, TipoEstudio tipoEstudio, String label) {
        JsonNode value = node.get(key);
        if (value == null || value.asText().isBlank()) {
            throw new IllegalArgumentException("Para " + tipoEstudio.name() + " es requerido " + label);
        }
    }
}
