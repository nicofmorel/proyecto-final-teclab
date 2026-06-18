package com.medical.api.config;

import com.medical.api.model.Complejidad;
import com.medical.api.model.Estudio;
import com.medical.api.model.Medico;
import com.medical.api.model.Paciente;
import com.medical.api.model.Rol;
import com.medical.api.model.TipoEstudio;
import com.medical.api.repository.EstudioRepository;
import com.medical.api.repository.MedicoRepository;
import com.medical.api.repository.PacienteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final MedicoRepository medicoRepository;
    private final PacienteRepository pacienteRepository;
    private final EstudioRepository estudioRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (medicoRepository.count() > 0 || pacienteRepository.count() > 0 || estudioRepository.count() > 0) {
            return;
        }

        Medico admin = medicoRepository.save(Medico.builder()
                .nombre("Admin")
                .apellido("Sistema")
                .documento("00000000")
                .matricula("ADM001")
                .especialidad("Administración")
                .mail("admin@medical.com")
                .password(passwordEncoder.encode("Admin2026!"))
                .rol(Rol.ADMIN)
                .activo(true)
                .build());

        Medico medicoActivo = medicoRepository.save(Medico.builder()
                .nombre("Nicolas")
                .apellido("Fernandez")
                .documento("41111111")
                .matricula("MER189231")
                .especialidad("Medico General")
                .mail("nico@gmail.com")
                .password(passwordEncoder.encode("Nico2026!"))
                .rol(Rol.MEDICO)
                .activo(true)
                .build());

        medicoRepository.save(Medico.builder()
                .nombre("Medico")
                .apellido("Prueba")
                .documento("41334665")
                .matricula("21803912")
                .especialidad("Medico de Cabecera")
                .mail("prueba@gmail.com")
                .password(passwordEncoder.encode("Prueba2026!"))
                .rol(Rol.MEDICO)
                .activo(false)
                .build());

        medicoRepository.save(Medico.builder()
                .nombre("Juan")
                .apellido("Perez")
                .documento("12345678")
                .matricula("MP001")
                .especialidad("Cardiología")
                .mail("juan@medical.com")
                .password(passwordEncoder.encode("Juan2026!"))
                .rol(Rol.MEDICO)
                .activo(false)
                .build());

        Paciente paciente1 = pacienteRepository.save(Paciente.builder()
                .nombre("Lucia")
                .apellido("Gomez")
                .fechaNacimiento(LocalDate.of(1993, 4, 10))
                .mail("lucia@example.com")
                .telefono("11-5555-1111")
                .medicoId(medicoActivo.getId())
                .activo(true)
                .build());

        Paciente paciente2 = pacienteRepository.save(Paciente.builder()
                .nombre("Martin")
                .apellido("Lopez")
                .fechaNacimiento(LocalDate.of(1987, 9, 22))
                .mail("martin@example.com")
                .telefono("11-5555-2222")
                .medicoId(medicoActivo.getId())
                .activo(true)
                .build());

        estudioRepository.save(Estudio.builder()
                .fecha(LocalDate.now().minusDays(5))
                .nombre("Estudio General")
                .observaciones("Todo se ve correcto.")
                .pacienteId(paciente1.getId())
                .medicoId(medicoActivo.getId())
                .archivoPath(null)
                .tipoEstudio(TipoEstudio.GENERICO)
                .complejidad(Complejidad.BAJA)
                .codigoEstudio("GEN-2026-0001")
                .detalles(null)
                .activo(true)
                .build());

        estudioRepository.save(Estudio.builder()
                .fecha(LocalDate.now().minusDays(2))
                .nombre("Radiografía de Tórax")
                .observaciones("Sin hallazgos agudos.")
                .pacienteId(paciente2.getId())
                .medicoId(medicoActivo.getId())
                .archivoPath(null)
                .tipoEstudio(TipoEstudio.RADIOGRAFIA)
                .complejidad(Complejidad.MEDIA)
                .codigoEstudio("RX-2026-0002")
                .detalles("{\"regionAnatomica\":\"Tórax\",\"lateralidad\":\"Bilateral\",\"proyeccion\":\"Frontal y lateral\",\"contraste\":\"No\"}")
                .activo(true)
                .build());

        estudioRepository.save(Estudio.builder()
                .fecha(LocalDate.now().minusDays(1))
                .nombre("Ecografía Abdominal")
                .observaciones("Control de rutina sin alteraciones relevantes.")
                .pacienteId(paciente1.getId())
                .medicoId(medicoActivo.getId())
                .archivoPath(null)
                .tipoEstudio(TipoEstudio.ECOGRAFIA)
                .complejidad(Complejidad.MEDIA)
                .codigoEstudio("ECO-2026-0003")
                .detalles("{\"zonaEstudio\":\"Abdomen superior\",\"ayuno\":\"Sí\",\"via\":\"Abdominal\",\"hallazgos\":\"Sin hallazgos patológicos\"}")
                .activo(true)
                .build());

        estudioRepository.save(Estudio.builder()
                .fecha(LocalDate.now())
                .nombre("Laboratorio Completo")
                .observaciones("Incluye análisis de control general.")
                .pacienteId(paciente2.getId())
                .medicoId(medicoActivo.getId())
                .archivoPath(null)
                .tipoEstudio(TipoEstudio.LABORATORIO)
                .complejidad(Complejidad.BAJA)
                .codigoEstudio("LAB-2026-0004")
                .detalles("{\"muestra\":\"Sangre\",\"panel\":\"Hemograma completo\",\"ayuno\":\"Sí\",\"prioridad\":\"Rutina\"}")
                .activo(true)
                .build());

        estudioRepository.save(Estudio.builder()
                .fecha(LocalDate.now().plusDays(1))
                .nombre("Tomografía de Cráneo")
                .observaciones("Estudio solicitado por cefalea persistente.")
                .pacienteId(paciente1.getId())
                .medicoId(medicoActivo.getId())
                .archivoPath(null)
                .tipoEstudio(TipoEstudio.TOMOGRAFIA)
                .complejidad(Complejidad.ALTA)
                .codigoEstudio("TAC-2026-0005")
                .detalles("{\"region\":\"Cráneo\",\"contraste\":\"Sí\",\"sedacion\":\"No\",\"observacionesTecnicas\":\"Cortes axiales sin incidencias\"}")
                .activo(true)
                .build());

        log.info("Seed data loaded: 4 medicos, 2 pacientes, 5 estudios");
    }
}
