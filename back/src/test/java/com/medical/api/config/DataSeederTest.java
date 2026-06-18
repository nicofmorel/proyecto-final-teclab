package com.medical.api.config;

import com.medical.api.repository.EstudioRepository;
import com.medical.api.repository.MedicoRepository;
import com.medical.api.repository.PacienteRepository;
import com.medical.api.model.TipoEstudio;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class DataSeederTest {

    @Autowired
    private MedicoRepository medicoRepository;

    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired
    private EstudioRepository estudioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void shouldLoadSeedDataIntoH2() {
        assertThat(medicoRepository.findByMail("admin@medical.com")).isPresent();
        assertThat(medicoRepository.findByMail("nico@gmail.com")).isPresent();
        assertThat(pacienteRepository.count()).isGreaterThanOrEqualTo(2);
        assertThat(estudioRepository.count()).isGreaterThanOrEqualTo(5);

        assertThat(estudioRepository.findAll())
                .extracting(estudio -> estudio.getTipoEstudio())
                .contains(TipoEstudio.GENERICO, TipoEstudio.RADIOGRAFIA, TipoEstudio.ECOGRAFIA, TipoEstudio.LABORATORIO, TipoEstudio.TOMOGRAFIA);

        var admin = medicoRepository.findByMail("admin@medical.com").orElseThrow();
        assertThat(passwordEncoder.matches("Admin2026!", admin.getPassword())).isTrue();
    }
}
