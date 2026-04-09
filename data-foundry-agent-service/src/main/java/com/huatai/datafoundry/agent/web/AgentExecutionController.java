package com.huatai.datafoundry.agent.web;

import com.huatai.datafoundry.agent.service.MockAgentService;
import com.huatai.datafoundry.contract.agent.AgentExecutionRequest;
import com.huatai.datafoundry.contract.agent.AgentExecutionResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/agent")
public class AgentExecutionController {
  private final MockAgentService mockAgentService = new MockAgentService();

  @PostMapping("/executions")
  public AgentExecutionResponse execute(@RequestBody AgentExecutionRequest request) {
    return mockAgentService.execute(request);
  }
}

