package com.medical.api.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.medical.api.model.Estudio;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class EstudioRepository extends JsonRepository<Estudio> {

    public EstudioRepository() {
        super("estudios.json", new TypeReference<List<Estudio>>() {});
    }

    public List<Estudio> findAll() {
        return readAll();
    }

    public List<Estudio> findByMedicoId(String medicoId) {
        return readAll().stream()
                .filter(e -> medicoId.equals(e.getMedicoId()))
                .collect(Collectors.toList());
    }

    public List<Estudio> findByPacienteId(String pacienteId) {
        return readAll().stream()
                .filter(e -> pacienteId.equals(e.getPacienteId()))
                .collect(Collectors.toList());
    }

    public Optional<Estudio> findById(String id) {
        return readAll().stream()
                .filter(e -> id.equals(e.getId()))
                .findFirst();
    }

    public Estudio save(Estudio estudio) {
        List<Estudio> estudios = readAll();
        estudios.removeIf(e -> e.getId().equals(estudio.getId()));
        estudios.add(estudio);
        writeAll(estudios);
        return estudio;
    }

    public void delete(String id) {
        List<Estudio> estudios = readAll();
        estudios.removeIf(e -> e.getId().equals(id));
        writeAll(estudios);
    }
}
