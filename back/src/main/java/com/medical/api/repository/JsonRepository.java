package com.medical.api.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReentrantReadWriteLock;

@Slf4j
public abstract class JsonRepository<T> {

    protected final ObjectMapper objectMapper;
    protected final ReentrantReadWriteLock lock;
    protected Path dataFilePath;

    @Value("${app.data.path:./data}")
    private String dataBasePath;

    private final String fileName;
    private final TypeReference<List<T>> typeReference;

    protected JsonRepository(String fileName, TypeReference<List<T>> typeReference) {
        this.fileName = fileName;
        this.typeReference = typeReference;
        this.lock = new ReentrantReadWriteLock();
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @PostConstruct
    public void init() {
        try {
            Path dataDir = Paths.get(dataBasePath);
            if (!Files.exists(dataDir)) {
                Files.createDirectories(dataDir);
                log.info("Created data directory: {}", dataDir.toAbsolutePath());
            }

            dataFilePath = dataDir.resolve(fileName);

            if (!Files.exists(dataFilePath)) {
                // Try to seed from classpath
                String classpathResource = "data/" + fileName;
                try {
                    ClassPathResource resource = new ClassPathResource(classpathResource);
                    if (resource.exists()) {
                        try (InputStream is = resource.getInputStream()) {
                            byte[] content = is.readAllBytes();
                            Files.write(dataFilePath, content);
                            log.info("Seeded {} from classpath resource", fileName);
                        }
                    } else {
                        Files.writeString(dataFilePath, "[]");
                        log.info("Initialized empty {}", fileName);
                    }
                } catch (Exception e) {
                    Files.writeString(dataFilePath, "[]");
                    log.info("Initialized empty {} (classpath seed failed)", fileName);
                }
            } else {
                log.info("Data file exists: {}", dataFilePath.toAbsolutePath());
            }
        } catch (IOException e) {
            log.error("Failed to initialize data file: {}", fileName);
            throw new RuntimeException("Could not initialize data storage for " + fileName, e);
        }
    }

    protected List<T> readAll() {
        lock.readLock().lock();
        try {
            String content = Files.readString(dataFilePath);
            if (content == null || content.isBlank()) {
                return new ArrayList<>();
            }
            return objectMapper.readValue(content, typeReference);
        } catch (IOException e) {
            log.error("Error reading data file: {}", fileName);
            return new ArrayList<>();
        } finally {
            lock.readLock().unlock();
        }
    }

    protected synchronized void writeAll(List<T> items) {
        lock.writeLock().lock();
        try {
            String content = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(items);
            Files.writeString(dataFilePath, content);
        } catch (IOException e) {
            log.error("Error writing data file: {}", fileName);
            throw new RuntimeException("Could not persist data to " + fileName, e);
        } finally {
            lock.writeLock().unlock();
        }
    }
}
