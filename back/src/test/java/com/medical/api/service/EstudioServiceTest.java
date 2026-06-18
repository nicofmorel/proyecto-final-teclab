package com.medical.api.service;

import com.medical.api.dto.EstudioRequest;
import com.medical.api.model.Complejidad;
import com.medical.api.model.Estudio;
import com.medical.api.model.Medico;
import com.medical.api.model.Paciente;
import com.medical.api.model.TipoEstudio;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medical.api.repository.EstudioRepository;
import com.medical.api.repository.MedicoRepository;
import com.medical.api.repository.PacienteRepository;
import com.medical.api.security.MedicoPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EstudioServiceTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Mock
    private EstudioRepository estudioRepository;

    @Mock
    private MedicoRepository medicoRepository;

    @Mock
    private PacienteRepository pacienteRepository;

    @InjectMocks
    private EstudioService estudioService;

    @Test
    void createShouldGenerateCodigoAndPersistDetalles() throws Exception {
        MedicoPrincipal principal = new MedicoPrincipal(1L, "admin@demo.com", "ADMIN");
        EstudioRequest request = baseRequest();
        request.setTipoEstudio(TipoEstudio.RADIOGRAFIA.name());
        request.setComplejidad(Complejidad.MEDIA.name());
        request.setDetalles(OBJECT_MAPPER.readTree("{\"regionAnatomica\":\"Tórax\",\"lateralidad\":\"Bilateral\",\"proyeccion\":\"Frontal y lateral\",\"contraste\":\"No\"}"));
        request.setMedicoId("1");

        when(pacienteRepository.findById(10L)).thenReturn(Optional.of(Paciente.builder().nombre("Luis").apellido("Gomez").build()));
        when(medicoRepository.findById(1L)).thenReturn(Optional.of(Medico.builder().nombre("Ana").apellido("Perez").build()));
        when(medicoRepository.findById(1L)).thenReturn(Optional.of(Medico.builder().nombre("Ana").apellido("Perez").build()));
        when(estudioRepository.save(any(Estudio.class))).thenAnswer(invocation -> {
            Estudio estudio = invocation.getArgument(0);
            estudio.setId(1L);
            return estudio;
        });

        var response = estudioService.create(request, null, principal);

        ArgumentCaptor<Estudio> captor = ArgumentCaptor.forClass(Estudio.class);
        verify(estudioRepository).save(captor.capture());
        Estudio saved = captor.getValue();

        assertThat(saved.getTipoEstudio()).isEqualTo(TipoEstudio.RADIOGRAFIA);
        assertThat(saved.getComplejidad()).isEqualTo(Complejidad.MEDIA);
        assertThat(saved.getDetalles()).contains("regionAnatomica");
        assertThat(saved.getCodigoEstudio()).startsWith("RX-");
        assertThat(response.getCodigoEstudio()).startsWith("RX-");
        assertThat(response.getTipoEstudio()).isEqualTo("RADIOGRAFIA");
        assertThat(response.getDetalles().get("regionAnatomica").asText()).isEqualTo("Tórax");
        assertThat(response.getPacienteNombre()).isEqualTo("Luis Gomez");
        assertThat(response.getMedicoNombre()).isEqualTo("Ana Perez");
    }

    @Test
    void updateShouldKeepExistingCodigoWhenRequestDoesNotSendOne() throws Exception {
        MedicoPrincipal principal = new MedicoPrincipal(1L, "medico@demo.com", "MEDICO");
        Estudio existing = Estudio.builder()
                .id(99L)
                .fecha(LocalDate.of(2026, 6, 1))
                .nombre("Estudio viejo")
                .observaciones("Viejo")
                .pacienteId(10L)
                .medicoId(1L)
                .codigoEstudio("GEN-ABC12345")
                .tipoEstudio(TipoEstudio.GENERICO)
                .complejidad(Complejidad.BAJA)
                .activo(true)
                .build();

        EstudioRequest request = baseRequest();
        request.setTipoEstudio(TipoEstudio.TOMOGRAFIA.name());
        request.setComplejidad(Complejidad.ALTA.name());
        request.setDetalles(OBJECT_MAPPER.readTree("{\"region\":\"Cráneo\",\"contraste\":\"Sí\",\"sedacion\":\"No\",\"observacionesTecnicas\":\"Sin incidencias\"}"));

        when(estudioRepository.findById(99L)).thenReturn(Optional.of(existing));
        when(pacienteRepository.findById(10L)).thenReturn(Optional.of(Paciente.builder().nombre("Luis").apellido("Gomez").build()));
        when(medicoRepository.findById(1L)).thenReturn(Optional.of(Medico.builder().nombre("Ana").apellido("Perez").build()));
        when(estudioRepository.save(any(Estudio.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = estudioService.update(99L, request, null, principal);

        ArgumentCaptor<Estudio> captor = ArgumentCaptor.forClass(Estudio.class);
        verify(estudioRepository).save(captor.capture());
        Estudio saved = captor.getValue();

        assertThat(saved.getCodigoEstudio()).isEqualTo("GEN-ABC12345");
        assertThat(saved.getTipoEstudio()).isEqualTo(TipoEstudio.TOMOGRAFIA);
        assertThat(saved.getComplejidad()).isEqualTo(Complejidad.ALTA);
        assertThat(response.getCodigoEstudio()).isEqualTo("GEN-ABC12345");
        assertThat(response.getPacienteNombre()).isEqualTo("Luis Gomez");
        assertThat(response.getMedicoNombre()).isEqualTo("Ana Perez");
    }

    @Test
    void createShouldRejectMissingRequiredDetailForSpecificType() throws Exception {
        MedicoPrincipal principal = new MedicoPrincipal(1L, "admin@demo.com", "ADMIN");
        EstudioRequest request = baseRequest();
        request.setTipoEstudio(TipoEstudio.LABORATORIO.name());
        request.setComplejidad(Complejidad.MEDIA.name());
        request.setDetalles(OBJECT_MAPPER.readTree("{\"muestra\":\"Sangre\",\"panel\":\"Hemograma completo\",\"ayuno\":\"Sí\"}"));
        request.setMedicoId("1");

        when(pacienteRepository.findById(10L)).thenReturn(Optional.of(new com.medical.api.model.Paciente()));
        when(medicoRepository.findById(1L)).thenReturn(Optional.of(new com.medical.api.model.Medico()));

        assertThatThrownBy(() -> estudioService.create(request, null, principal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("prioridad");
    }

    @Test
    void generatePdfShouldReturnPdfBytes() {
        MedicoPrincipal principal = new MedicoPrincipal(1L, "admin@demo.com", "ADMIN");
        Estudio existing = Estudio.builder()
                .id(99L)
                .fecha(LocalDate.of(2026, 6, 1))
                .nombre("Estudio viejo")
                .observaciones("Viejo")
                .pacienteId(10L)
                .medicoId(1L)
                .codigoEstudio("GEN-ABC12345")
                .tipoEstudio(TipoEstudio.GENERICO)
                .complejidad(Complejidad.BAJA)
                .detalles("{\"nota\":\"ok\"}")
                .activo(true)
                .build();

        Medico medico = Medico.builder().nombre("Ana").apellido("Perez").build();
        Paciente paciente = Paciente.builder().nombre("Luis").apellido("Gomez").build();

        when(estudioRepository.findById(99L)).thenReturn(Optional.of(existing));
        when(medicoRepository.findById(1L)).thenReturn(Optional.of(medico));
        when(pacienteRepository.findById(10L)).thenReturn(Optional.of(paciente));

        byte[] pdf = estudioService.generatePdf(99L, principal);

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 4, StandardCharsets.US_ASCII)).isEqualTo("%PDF");
    }

    private EstudioRequest baseRequest() {
        EstudioRequest request = new EstudioRequest();
        request.setFecha(LocalDate.of(2026, 6, 18));
        request.setNombre("Estudio de prueba");
        request.setObservaciones("Observación");
        request.setPacienteId("10");
        return request;
    }
}
