package com.medical.api.repository;

import com.medical.api.model.Estudio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EstudioRepository extends JpaRepository<Estudio, Long> {
    List<Estudio> findByMedicoId(Long medicoId);
    List<Estudio> findByPacienteId(Long pacienteId);
}
