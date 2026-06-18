package com.medical.api.repository;

import com.medical.api.model.Estudio;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class EstudioRepositoryTest {

    @Autowired
    private EstudioRepository estudioRepository;

    @Test
    void shouldFindEstudiosByPacienteId() {
        Estudio e1 = Estudio.builder().nombre("E1").pacienteId(10L).medicoId(1L).activo(true).build();
        Estudio e2 = Estudio.builder().nombre("E2").pacienteId(10L).medicoId(1L).activo(true).build();
        Estudio e3 = Estudio.builder().nombre("E3").pacienteId(20L).medicoId(1L).activo(true).build();

        estudioRepository.save(e1);
        estudioRepository.save(e2);
        estudioRepository.save(e3);

        List<Estudio> result = estudioRepository.findByPacienteId(10L);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Estudio::getNombre).containsExactlyInAnyOrder("E1", "E2");
    }
}
