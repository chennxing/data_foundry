package com.huatai.datafoundry.backend.requirement.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.huatai.datafoundry.backend.requirement.application.service.dto.CollectionPromptPayload;
import java.io.InputStream;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;

@Service
public class PromptYamlParseService {
  private static final long MAX_FILE_SIZE_BYTES = 1024L * 1024L;
  private static final String FIXED_USER_ID = "021954";
  private static final int FIXED_MAX_ITERATIONS = 2;
  private static final boolean FIXED_REQUIRE_SCHEMA_APPROVAL = false;

  private final ObjectMapper objectMapper;

  public PromptYamlParseService(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public CollectionPromptPayload parse(MultipartFile file) {
    validateFile(file);
    Object loaded;
    try (InputStream input = file.getInputStream()) {
      LoaderOptions options = new LoaderOptions();
      options.setAllowDuplicateKeys(false);
      Yaml yaml = new Yaml(new SafeConstructor(options));
      loaded = yaml.load(input);
    } catch (IllegalArgumentException ex) {
      throw ex;
    } catch (Exception ex) {
      throw new IllegalArgumentException("YAML文件解析失败：" + ex.getMessage());
    }

    if (!(loaded instanceof Map)) {
      throw new IllegalArgumentException("YAML文件顶层结构必须是对象");
    }

    Map<?, ?> yamlMap = (Map<?, ?>) loaded;
    String query = textValue(yamlMap.get("query"), "query");
    String background = textValue(yamlMap.get("background"), "background");
    if (isBlank(query)) {
      throw new IllegalArgumentException("YAML文件缺少必填字段 query");
    }
    if (isBlank(background)) {
      throw new IllegalArgumentException("YAML文件缺少必填字段 background");
    }

    CollectionPromptPayload payload = new CollectionPromptPayload();
    payload.setQuery(query.trim());
    payload.setBackground(background.trim());
    payload.setUserId(FIXED_USER_ID);
    payload.setMaxIterations(Integer.valueOf(FIXED_MAX_ITERATIONS));
    payload.setRequireSchemaApproval(Boolean.valueOf(FIXED_REQUIRE_SCHEMA_APPROVAL));
    return payload;
  }

  private void validateFile(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("请选择YAML文件");
    }
    String fileName = Objects.toString(file.getOriginalFilename(), "").trim().toLowerCase();
    if (!fileName.endsWith(".yaml") && !fileName.endsWith(".yml")) {
      throw new IllegalArgumentException("仅支持上传 .yaml 或 .yml 文件");
    }
    if (file.getSize() > MAX_FILE_SIZE_BYTES) {
      throw new IllegalArgumentException("YAML文件不能超过1MB");
    }
  }

  private String textValue(Object value, String fieldName) {
    if (value == null) {
      return "";
    }
    if (value instanceof String) {
      return (String) value;
    }
    try {
      return objectMapper.writeValueAsString(value);
    } catch (Exception ex) {
      throw new IllegalArgumentException("YAML字段 " + fieldName + " 无法转换为文本");
    }
  }

  private boolean isBlank(String value) {
    return value == null || value.trim().isEmpty();
  }
}
