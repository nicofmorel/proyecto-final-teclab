package com.medical.api.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.medical.api.model.Medico;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class MedicoRepository extends JsonRepository<Medico> {

    public MedicoRepository() {
        super("medicos.json", new TypeReference<List<Medico>>() {});
    }

    public List<Medico> findAll() {
        return readAll();
    }

    public Optional<Medico> findById(String id) {
        return readAll().stream()
                .filter(m -> id.equals(m.getId()))
                .findFirst();
    }

    public Optional<Medico> findByMail(String mail) {
        return readAll().stream()
                .filter(m -> mail.equalsIgnoreCase(m.getMail()))
                .findFirst();
    }

    public boolean existsByMail(String mail) {
        return readAll().stream()
                .anyMatch(m -> mail.equalsIgnoreCase(m.getMail()));
    }

    public boolean existsByDocumento(String documento) {
        return readAll().stream()
                .anyMatch(m -> documento.equals(m.getDocumento()));
    }

    public boolean existsByMatricula(String matricula) {
        return readAll().stream()
                .anyMatch(m -> matricula.equals(m.getMatricula()));
    }

    public Medico save(Medico medico) {
        List<Medico> medicos = readAll();
        medicos.removeIf(m -> m.getId().equals(medico.getId()));
        medicos.add(medico);
        writeAll(medicos);
        return medico;
    }

    public void delete(String id) {
        List<Medico> medicos = readAll();
        medicos.removeIf(m -> m.getId().equals(id));
        writeAll(medicos);
    }
}
