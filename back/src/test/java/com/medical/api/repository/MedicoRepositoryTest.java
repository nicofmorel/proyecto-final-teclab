package com.medical.api.repository;

import com.medical.api.model.Medico;
import com.medical.api.model.Rol;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class MedicoRepositoryTest {

    @Autowired
    private MedicoRepository medicoRepository;

    @Test
    void shouldSaveAndFindMedicoByMail() {
        Medico medico = Medico.builder()
                .nombre("Juan")
                .apellido("Perez")
                .documento("12345678")
                .matricula("MAT123")
                .especialidad("Cardiología")
                .mail("juan.perez@example.com")
                .password("password")
                .rol(Rol.MEDICO)
                .activo(true)
                .build();

        medicoRepository.save(medico);

        Optional<Medico> found = medicoRepository.findByMail("juan.perez@example.com");

        assertThat(found).isPresent();
        assertThat(found.get().getNombre()).isEqualTo("Juan");
    }
}
