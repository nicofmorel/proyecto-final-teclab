package com.medical.api.repository;

import com.medical.api.model.Medico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MedicoRepository extends JpaRepository<Medico, Long> {
    Optional<Medico> findByMail(String mail);
    boolean existsByMail(String mail);
    boolean existsByDocumento(String documento);
    boolean existsByMatricula(String matricula);
}
