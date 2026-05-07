package com.medical.api.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.medical.api.model.Paciente;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class PacienteRepository extends JsonRepository<Paciente> {

    public PacienteRepository() {
        super("pacientes.json", new TypeReference<List<Paciente>>() {});
    }

    public List<Paciente> findAll() {
        return readAll();
    }

    public List<Paciente> findByMedicoId(String medicoId) {
        return readAll().stream()
                .filter(p -> medicoId.equals(p.getMedicoId()))
                .collect(Collectors.toList());
    }

    public Optional<Paciente> findById(String id) {
        return readAll().stream()
                .filter(p -> id.equals(p.getId()))
                .findFirst();
    }

    public Paciente save(Paciente paciente) {
        List<Paciente> pacientes = readAll();
        pacientes.removeIf(p -> p.getId().equals(paciente.getId()));
        pacientes.add(paciente);
        writeAll(pacientes);
        return paciente;
    }

    public void delete(String id) {
        List<Paciente> pacientes = readAll();
        pacientes.removeIf(p -> p.getId().equals(id));
        writeAll(pacientes);
    }
}
