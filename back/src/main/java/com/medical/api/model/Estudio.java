package com.medical.api.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "estudios")
public class Estudio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate fecha;

    private String nombre;
    private String observaciones;
    private Long pacienteId;
    private Long medicoId;
    private String archivoPath;
    private String archivoNombreOriginal;
    private boolean activo;

    @Enumerated(EnumType.STRING)
    private TipoEstudio tipoEstudio;

    @Enumerated(EnumType.STRING)
    private Complejidad complejidad;

    private String codigoEstudio;

    @Lob
    private String detalles;
}
