package com.huatai.datafoundry.backend.web;

import com.huatai.datafoundry.backend.persistence.ProjectMapper;
import com.huatai.datafoundry.backend.persistence.ProjectRecord;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
  private final ProjectMapper projectMapper;

  public ProjectController(ProjectMapper projectMapper) {
    this.projectMapper = projectMapper;
  }

  @GetMapping
  public List<ProjectRecord> listProjects() {
    return projectMapper.listProjects();
  }

  @GetMapping("/{projectId}")
  public ProjectRecord getProject(@PathVariable("projectId") String projectId) {
    ProjectRecord record = projectMapper.getProject(projectId);
    if (record == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
    }
    return record;
  }
}

