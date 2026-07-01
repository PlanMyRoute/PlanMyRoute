import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { toISODate } from "@/utils/formatDate";
import { StyleSheet, View } from "react-native";
import { Calendar, DateData, LocaleConfig } from "react-native-calendars";
import { MicrotextDark } from "./CustomText";

LocaleConfig.locales["es"] = {
  monthNames: [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ],
  monthNamesShort: [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ],
  dayNames: [
    "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
  ],
  dayNamesShort: ["D", "L", "M", "X", "J", "V", "S"],
  today: "Hoy",
};
LocaleConfig.defaultLocale = "es";

export interface TripDateRange {
  startDate: string;
  endDate: string;
  name: string;
}

interface CustomCalendarProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onRangeSelect: (start: Date, end: Date | null) => void;
  minDate?: Date;
  existingTrips?: TripDateRange[];
}

const COLORS = {
  primary: "#FFD700",
  primaryLight: "rgba(255, 215, 0, 0.35)",
  text: "#202020",
  white: "#FFFFFF",
  overlap: "rgba(209, 213, 219, 0.5)",
};

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  startDate,
  endDate,
  onRangeSelect,
  minDate = new Date(),
  existingTrips = [],
}) => {
  const markedDates = useMemo(() => {
    const marks: any = {};
    const startStr = startDate ? toISODate(startDate) : null;
    const endStr = endDate ? toISODate(endDate) : null;

    for (const trip of existingTrips) {
      if (!trip.startDate || !trip.endDate) continue;
      let current = trip.startDate;
      while (current <= trip.endDate) {
        const isFirst = current === trip.startDate;
        const isLast = current === trip.endDate;
        marks[current] = {
          color: COLORS.overlap,
          textColor: "#6B7280",
          startingDay: isFirst,
          endingDay: isLast,
        };
        current = addDays(current, 1);
      }
    }

    if (startStr && endStr) {
      let current = startStr;
      while (current <= endStr) {
        const isStart = current === startStr;
        const isEnd = current === endStr;
        marks[current] = {
          selected: true,
          color: isStart || isEnd ? COLORS.primary : COLORS.primaryLight,
          textColor: COLORS.text,
          startingDay: isStart,
          endingDay: isEnd,
        };
        current = addDays(current, 1);
      }
    } else if (startStr) {
      marks[startStr] = {
        selected: true,
        startingDay: true,
        endingDay: true,
        color: COLORS.primary,
        textColor: COLORS.text,
        customContainerStyle: { borderRadius: 8 },
      };
    }

    return marks;
  }, [startDate, endDate, existingTrips]);

  const onDayPress = (day: DateData) => {
    const selectedDate = new Date(day.dateString + "T12:00:00");

    if (!startDate || (startDate && endDate)) {
      onRangeSelect(selectedDate, null);
    } else if (selectedDate < startDate) {
      onRangeSelect(selectedDate, null);
    } else if (toISODate(selectedDate) === toISODate(startDate)) {
      onRangeSelect(selectedDate, null);
    } else {
      onRangeSelect(startDate, selectedDate);
    }
  };

  const hasOverlap = existingTrips.length > 0 && startDate && endDate && existingTrips.some((trip) => {
    if (!trip.startDate || !trip.endDate) return false;
    return toISODate(startDate) <= trip.endDate && toISODate(endDate) >= trip.startDate;
  });

  return (
    <View style={styles.container}>
      <Calendar
        current={startDate ? toISODate(startDate) : toISODate(new Date())}
        minDate={toISODate(minDate)}
        onDayPress={onDayPress}
        firstDay={1}
        enableSwipeMonths
        renderArrow={(direction) => (
          <Ionicons
            name={direction === "left" ? "chevron-back" : "chevron-forward"}
            size={22}
            color={COLORS.text}
          />
        )}
        markingType="period"
        markedDates={markedDates}
        theme={{
          backgroundColor: COLORS.white,
          calendarBackground: COLORS.white,
          textSectionTitleColor: "#9CA3AF",
          selectedDayBackgroundColor: COLORS.primary,
          selectedDayTextColor: COLORS.text,
          todayTextColor: COLORS.primary,
          dayTextColor: "#374151",
          textDisabledColor: "#D1D5DB",
          arrowColor: COLORS.text,
          disabledArrowColor: "#D1D5DB",
          monthTextColor: COLORS.text,
          indicatorColor: COLORS.primary,
          textDayFontWeight: "400",
          textMonthFontWeight: "bold",
          textDayHeaderFontWeight: "500",
          textDayFontSize: 15,
          textMonthFontSize: 17,
          textDayHeaderFontSize: 12,
        }}
      />
      {hasOverlap && (
        <View style={styles.overlapWarning}>
          <Ionicons name="alert-circle-outline" size={14} color="#D97706" />
          <MicrotextDark style={{ color: "#92400E", marginLeft: 6, flex: 1 }}>
            Estas fechas se solapan con otro viaje tuyo
          </MicrotextDark>
        </View>
      )}
      {existingTrips.length > 0 && (
        <View style={styles.legend}>
          <View style={[styles.legendSwatch, { backgroundColor: COLORS.overlap }]} />
          <MicrotextDark style={{ color: "#9CA3AF" }}>Otros viajes</MicrotextDark>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 4,
  },
  overlapWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  legendSwatch: {
    width: 14,
    height: 8,
    borderRadius: 2,
  },
});

export default CustomCalendar;
