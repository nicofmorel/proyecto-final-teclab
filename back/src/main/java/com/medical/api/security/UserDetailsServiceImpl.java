package com.medical.api.security;

import com.medical.api.model.Medico;
import com.medical.api.repository.MedicoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final MedicoRepository medicoRepository;

    @Override
    public UserDetails loadUserByUsername(String mail) throws UsernameNotFoundException {
        Medico medico = medicoRepository.findByMail(mail)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        if (!medico.isActivo()) {
            throw new UsernameNotFoundException("Usuario inactivo");
        }

        return new User(
                medico.getMail(),
                medico.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_" + medico.getRol().name()))
        );
    }
}
