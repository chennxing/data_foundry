package com.huatai.datafoundry.backend.requirement.interfaces.web;

import com.huatai.datafoundry.backend.requirement.application.service.PromptYamlParseService;
import com.huatai.datafoundry.backend.requirement.application.service.dto.CollectionPromptPayload;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/prompt-templates")
public class PromptTemplateFacadeController {
  private final PromptYamlParseService promptYamlParseService;

  public PromptTemplateFacadeController(PromptYamlParseService promptYamlParseService) {
    this.promptYamlParseService = promptYamlParseService;
  }

  @PostMapping("/parse-yaml")
  public ResponseEntity<Map<String, Object>> parseYaml(@RequestPart("file") MultipartFile file) {
    try {
      CollectionPromptPayload payload = promptYamlParseService.parse(file);
      Map<String, Object> out = new HashMap<String, Object>();
      out.put("success", Boolean.TRUE);
      out.put("data", payload);
      return ResponseEntity.ok(out);
    } catch (IllegalArgumentException ex) {
      Map<String, Object> out = new HashMap<String, Object>();
      out.put("success", Boolean.FALSE);
      out.put("message", ex.getMessage());
      return ResponseEntity.badRequest().body(out);
    }
  }
}
