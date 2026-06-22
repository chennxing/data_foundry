package com.huatai.datafoundry.backend.schedule.domain.service;

import com.huatai.datafoundry.contract.scheduler.ScheduleFrequency;
import java.time.LocalDate;
import java.time.LocalTime;

public final class CronExpressionBuilder {
  private static final String[] QUARTER_END_MONTHS = {"3", "6", "9", "12"};
  private static final String[] QUARTER_NEXT_MONTHS = {"1", "4", "7", "10"};
  private static final String[] WEEK_DAYS = {
    "SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"
  };

  private CronExpressionBuilder() {
  }

  public static String build(String frequencyValue, LocalTime triggerTime, Integer offsetDays) {
    ScheduleFrequency frequency = ScheduleFrequency.parse(frequencyValue);
    int offset = normalizeOffsetDays(offsetDays);
    validateExpressibleOffset(frequency, offset);
    LocalTime effectiveTime = triggerTime != null ? triggerTime : LocalTime.of(9, 0);

    switch (frequency) {
      case DAILY:
        return cron(effectiveTime, "*", "*", "?");
      case WEEKLY:
        return cron(effectiveTime, "?", "*", WEEK_DAYS[offset % 7]);
      case MONTHLY:
        return cron(effectiveTime, offset == 0 ? "L" : String.valueOf(offset), "*", "?");
      case QUARTERLY:
        return cron(
            effectiveTime,
            offset == 0 ? "L" : String.valueOf(offset),
            offset == 0 ? join(QUARTER_END_MONTHS) : join(QUARTER_NEXT_MONTHS),
            "?");
      case YEARLY:
        if (offset == 0) {
          return cron(effectiveTime, "31", "12", "?");
        }
        LocalDate annualDate = LocalDate.of(2025, 1, 1).plusDays(offset - 1L);
        return cron(
            effectiveTime,
            String.valueOf(annualDate.getDayOfMonth()),
            String.valueOf(annualDate.getMonthValue()),
            "?");
      default:
        throw new IllegalArgumentException("Unsupported schedule frequency: " + frequency.name());
    }
  }

  public static void validateExpressibleOffset(String frequencyValue, Integer offsetDays) {
    validateExpressibleOffset(
        ScheduleFrequency.parse(frequencyValue), normalizeOffsetDays(offsetDays));
  }

  public static int parseOffsetDays(Object value, int fallback, String fieldName) {
    if (value == null) {
      return fallback;
    }
    String text = String.valueOf(value).trim();
    if (text.isEmpty()) {
      return fallback;
    }
    try {
      int parsed = Integer.parseInt(text);
      if (parsed < 0) {
        throw new IllegalArgumentException(fieldName + " must be >= 0");
      }
      return parsed;
    } catch (NumberFormatException ex) {
      throw new IllegalArgumentException(fieldName + " must be an integer", ex);
    }
  }

  private static void validateExpressibleOffset(ScheduleFrequency frequency, int offsetDays) {
    switch (frequency) {
      case DAILY:
      case WEEKLY:
        return;
      case MONTHLY:
        if (offsetDays <= 28) {
          return;
        }
        break;
      case QUARTERLY:
        if (offsetDays <= 30) {
          return;
        }
        break;
      case YEARLY:
        if (offsetDays <= 59) {
          return;
        }
        break;
      default:
        break;
    }
    throw new IllegalArgumentException(
        "Schedule offset "
            + offsetDays
            + " cannot be expressed as a "
            + frequency.name()
            + " cron expression without falling back to daily triggering");
  }

  private static int normalizeOffsetDays(Integer offsetDays) {
    return offsetDays != null ? Math.max(0, offsetDays.intValue()) : 0;
  }

  private static String cron(LocalTime time, String dayOfMonth, String month, String dayOfWeek) {
    return time.getSecond()
        + " "
        + time.getMinute()
        + " "
        + time.getHour()
        + " "
        + dayOfMonth
        + " "
        + month
        + " "
        + dayOfWeek;
  }

  private static String join(String[] values) {
    StringBuilder builder = new StringBuilder();
    for (String value : values) {
      if (builder.length() > 0) {
        builder.append(",");
      }
      builder.append(value);
    }
    return builder.toString();
  }
}
