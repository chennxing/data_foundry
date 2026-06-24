package com.huatai.datafoundry.backend.requirement.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.huatai.datafoundry.backend.requirement.application.service.dto.CollectionPromptPayload;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class PromptYamlParseServiceTest {
  private final PromptYamlParseService service = new PromptYamlParseService(new ObjectMapper());

  @Test
  void parsesQueryBackgroundAndFillsFixedFields() {
    String yaml = ""
        + "user_id: should_be_ignored\n"
        + "max_iterations: 99\n"
        + "require_schema_approval: true\n"
        + "query: |\n"
        + "  collect latest data\n"
        + "background: |\n"
        + "  domain_meta:\n"
        + "    industry_name: SmartDriveTech\n";

    CollectionPromptPayload payload = service.parse(file("template.yaml", yaml));

    assertEquals("collect latest data", payload.getQuery());
    assertEquals("domain_meta:\n  industry_name: SmartDriveTech", payload.getBackground());
    assertEquals("021954", payload.getUserId());
    assertEquals(Integer.valueOf(2), payload.getMaxIterations());
    assertFalse(payload.getRequireSchemaApproval().booleanValue());
  }

  @Test
  void rejectsMissingQuery() {
    assertThrows(IllegalArgumentException.class, () -> service.parse(file(
        "template.yaml",
        "background: ok\n")));
  }

  @Test
  void rejectsMissingBackground() {
    assertThrows(IllegalArgumentException.class, () -> service.parse(file(
        "template.yaml",
        "query: ok\n")));
  }

  @Test
  void rejectsNonYamlExtension() {
    assertThrows(IllegalArgumentException.class, () -> service.parse(file(
        "template.txt",
        "query: ok\nbackground: ok\n")));
  }

  private static MockMultipartFile file(String name, String content) {
    return new MockMultipartFile("file", name, "text/yaml", content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
  }
}
