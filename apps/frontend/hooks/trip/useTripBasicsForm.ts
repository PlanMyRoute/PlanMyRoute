import { useState } from "react";
import { formatNumericDate } from "@/utils/formatDate";
import { LocationData } from "@/utils/tripValidation";

/**
 * Hook de formulario para los datos básicos del viaje: origen, destino, fechas, horarios e ida y vuelta.
 * @returns Estado del formulario, setters, funciones de formato y reset
 */
export function useTripBasicsForm() {
  const [origin, setOrigin] = useState("");
  const [originData, setOriginData] = useState<LocationData | null>(null);
  const [destination, setDestination] = useState("");
  const [destinationData, setDestinationData] = useState<LocationData | null>(
    null,
  );
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [roundTrip, setRoundTrip] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const formatTime = (time: Date | null) => {
    if (!time) return "";
    return time.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const reset = () => {
    setOrigin("");
    setOriginData(null);
    setDestination("");
    setDestinationData(null);
    setStartDate(null);
    setEndDate(null);
    setStartTime(null);
    setEndTime(null);
    setRoundTrip(false);
    setShowStartPicker(false);
    setShowEndPicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
  };

  return {
    origin,
    setOrigin,
    originData,
    setOriginData,
    destination,
    setDestination,
    destinationData,
    setDestinationData,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    roundTrip,
    setRoundTrip,
    showStartPicker,
    setShowStartPicker,
    showEndPicker,
    setShowEndPicker,
    showStartTimePicker,
    setShowStartTimePicker,
    showEndTimePicker,
    setShowEndTimePicker,
    formatDate: formatNumericDate,
    formatTime,
    reset,
  };
}
