package com.huatai.datafoundry.backend.schedule.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.huatai.datafoundry.backend.schedule.domain.model.ScheduleRule;
import com.huatai.datafoundry.backend.schedule.domain.repository.ScheduleRuleRepository;
import com.huatai.datafoundry.backend.task.domain.model.WideTablePlanSource;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

class ScheduleRuleSyncAppServiceTest {

  @Test
  void createsOneStableRulePerIndicatorGroup() {
    ScheduleRuleRepository repository = Mockito.mock(ScheduleRuleRepository.class);
    ScheduleRuleSyncAppService service =
        new ScheduleRuleSyncAppService(repository, new ObjectMapper());
    WideTablePlanSource wideTable = new WideTablePlanSource();
    wideTable.setId("wt-1");
    wideTable.setRequirementId("req-1");
    wideTable.setIndicatorGroupsJson(
        "[{\"id\":\"ig-1\",\"name\":\"A\",\"indicator_columns\":[\"metric_a\"]},"
            + "{\"id\":\"ig-2\",\"name\":\"B\",\"indicator_columns\":[\"metric_b\"]}]");
    wideTable.setScheduleRulesJson(
        "[{\"frequency\":\"MONTHLY\",\"trigger_time\":\"08:30\","
            + "\"business_date_offset_days\":3,\"enabled\":true}]");

    Map<String, ScheduleRule> first = service.sync(wideTable);
    Map<String, ScheduleRule> second = service.sync(wideTable);

    assertEquals(2, first.size());
    assertEquals(first.get("ig-1").getId(), second.get("ig-1").getId());
    assertEquals(Integer.valueOf(3), first.get("ig-1").getBusinessDateOffsetDays());
    assertEquals(LocalTime.of(8, 30), first.get("ig-1").getTriggerTime());
    assertEquals("0 30 8 3 * ?", first.get("ig-1").getCronExpression());
    assertTrue(first.get("ig-1").getRuleCode().length() <= 128);
    assertEquals(64, first.get("ig-1").getXxlSyncHash().length());
    assertEquals(
        first.get("ig-1").getXxlSyncHash(),
        second.get("ig-1").getXxlSyncHash());

    @SuppressWarnings("unchecked")
    ArgumentCaptor<List<ScheduleRule>> captor =
        ArgumentCaptor.forClass((Class) List.class);
    verify(repository, Mockito.times(2)).upsertBatch(captor.capture());
    assertEquals(2, captor.getAllValues().get(0).size());
    verify(repository, Mockito.times(2))
        .disableMissingIndicatorGroups(any(), any(), any());
  }

  @Test
  void ignoresIndicatorGroupsWithoutIndicatorColumnsAndDisablesTheirRules() {
    ScheduleRuleRepository repository = Mockito.mock(ScheduleRuleRepository.class);
    ScheduleRuleSyncAppService service =
        new ScheduleRuleSyncAppService(repository, new ObjectMapper());
    WideTablePlanSource wideTable = new WideTablePlanSource();
    wideTable.setId("wt-1");
    wideTable.setRequirementId("req-1");
    wideTable.setIndicatorGroupsJson(
        "[{\"id\":\"ig-active\",\"name\":\"Active\",\"indicator_columns\":[\"metric_a\"]},"
            + "{\"id\":\"ig-empty\",\"name\":\"Empty\",\"indicator_columns\":[]}]");
    wideTable.setScheduleRulesJson(
        "[{\"frequency\":\"MONTHLY\",\"trigger_time\":\"08:30\"," 
            + "\"business_date_offset_days\":3,\"enabled\":true}]");

    Map<String, ScheduleRule> rules = service.sync(wideTable);

    assertEquals(1, rules.size());
    assertTrue(rules.containsKey("ig-active"));
    @SuppressWarnings("unchecked")
    ArgumentCaptor<List<ScheduleRule>> captor =
        ArgumentCaptor.forClass((Class) List.class);
    verify(repository).upsertBatch(captor.capture());
    assertEquals(1, captor.getValue().size());
    assertEquals("ig-active", captor.getValue().get(0).getIndicatorGroupId());
    verify(repository).disableMissingIndicatorGroups(
        Mockito.eq("req-1"), Mockito.eq("wt-1"), Mockito.eq(rules.keySet()));
  }

  @Test
  void rejectsMonthlyOffsetsThatWouldRequireDailyFallback() {
    ScheduleRuleRepository repository = Mockito.mock(ScheduleRuleRepository.class);
    ScheduleRuleSyncAppService service =
        new ScheduleRuleSyncAppService(repository, new ObjectMapper());
    WideTablePlanSource wideTable = new WideTablePlanSource();
    wideTable.setId("wt-1");
    wideTable.setRequirementId("req-1");
    wideTable.setIndicatorGroupsJson(
        "[{\"id\":\"ig-1\",\"name\":\"A\",\"indicator_columns\":[\"metric_a\"]}]");
    wideTable.setScheduleRulesJson(
        "[{\"frequency\":\"MONTHLY\",\"trigger_time\":\"08:30\","
            + "\"business_date_offset_days\":29,\"enabled\":true}]");

    assertThrows(IllegalArgumentException.class, () -> service.sync(wideTable));
  }
}
