package com.medical.api.service;

import com.medical.api.model.Medico;
import com.medical.api.model.Rol;
import com.medical.api.repository.MedicoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MedicoServiceTest {

    @Mock
    private MedicoRepository medicoRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private MedicoService medicoService;

    @Test
    void reactivateShouldSetMedicoActivoTrue() {
        Medico medico = Medico.builder()
                .id(1L)
                .nombre("Ana")
                .apellido("Perez")
                .mail("ana@demo.com")
                .rol(Rol.MEDICO)
                .activo(false)
                .build();

        when(medicoRepository.findById(1L)).thenReturn(Optional.of(medico));
        when(medicoRepository.save(any(Medico.class))).thenAnswer(invocation -> invocation.getArgument(0));

        medicoService.reactivate(1L);

        ArgumentCaptor<Medico> captor = ArgumentCaptor.forClass(Medico.class);
        verify(medicoRepository).save(captor.capture());
        assertThat(captor.getValue().isActivo()).isTrue();
    }
}
