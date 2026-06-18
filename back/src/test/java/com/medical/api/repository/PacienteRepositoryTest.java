package com.medical.api.repository;

import com.medical.api.model.Paciente;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class PacienteRepositoryTest {

    @Autowired
    private PacienteRepository pacienteRepository;

    @Test
    void shouldFindPacientesByMedicoId() {
        Paciente p1 = Paciente.builder().nombre("P1").medicoId(1L).activo(true).build();
        Paciente p2 = Paciente.builder().nombre("P2").medicoId(1L).activo(true).build();
        Paciente p3 = Paciente.builder().nombre("P3").medicoId(2L).activo(true).build();

        pacienteRepository.save(p1);
        pacienteRepository.save(p2);
        pacienteRepository.save(p3);

        List<Paciente> result = pacienteRepository.findByMedicoId(1L);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Paciente::getNombre).containsExactlyInAnyOrder("P1", "P2");
    }
}
