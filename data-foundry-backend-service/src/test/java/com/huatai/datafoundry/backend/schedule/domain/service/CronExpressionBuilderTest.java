package com.huatai.datafoundry.backend.schedule.domain.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.LocalTime;
import org.junit.jupiter.api.Test;

class CronExpressionBuilderTest {

  @Test
  void buildsRealFrequencyCrons() {
    LocalTime triggerTime = LocalTime.of(8, 30);

    assertEquals("0 30 8 * * ?", CronExpressionBuilder.build("DAILY", triggerTime, 3));
    assertEquals("0 30 8 ? * WED", CronExpressionBuilder.build("WEEKLY", triggerTime, 3));
    assertEquals("0 30 8 3 * ?", CronExpressionBuilder.build("MONTHLY", triggerTime, 3));
    assertEquals(
        "0 30 8 3 1,4,7,10 ?",
        CronExpressionBuilder.build("QUARTERLY", triggerTime, 3));
    assertEquals("0 30 8 3 1 ?", CronExpressionBuilder.build("YEARLY", triggerTime, 3));
  }

  @Test
  void supportsLastDayExpressionsForPeriodEndTriggers() {
    LocalTime triggerTime = LocalTime.of(8, 30);

    assertEquals("0 30 8 L * ?", CronExpressionBuilder.build("MONTHLY", triggerTime, 0));
    assertEquals(
        "0 30 8 L 3,6,9,12 ?",
        CronExpressionBuilder.build("QUARTERLY", triggerTime, 0));
    assertEquals("0 30 8 31 12 ?", CronExpressionBuilder.build("YEARLY", triggerTime, 0));
  }

  @Test
  void rejectsOffsetsThatCannotBeExpressedWithoutDailyFallback() {
    assertThrows(
        IllegalArgumentException.class,
        () -> CronExpressionBuilder.build("MONTHLY", LocalTime.of(9, 0), 29));
    assertThrows(
        IllegalArgumentException.class,
        () -> CronExpressionBuilder.build("QUARTERLY", LocalTime.of(9, 0), 31));
    assertThrows(
        IllegalArgumentException.class,
        () -> CronExpressionBuilder.build("YEARLY", LocalTime.of(9, 0), 60));
  }
}
