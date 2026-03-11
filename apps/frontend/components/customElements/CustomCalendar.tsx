import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';

// --- Configuración de Idioma (Español) ---
LocaleConfig.locales['es'] = {
    monthNames: [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ],
    monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    dayNamesShort: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
    today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

// --- Tipos ---
interface CustomCalendarProps {
    startDate?: Date | null;
    endDate?: Date | null;
    onRangeSelect: (start: Date, end: Date | null) => void;
    minDate?: Date;
    isRoundTrip: boolean;
}

// --- Colores de tu App (Ajústalos si tienes variables exactas) ---
const COLORS = {
    primary: '#FFD700', // Tu amarillo
    primaryLight: 'rgba(255, 215, 0, 0.4)', // Amarillo transparente para el rango
    text: '#202020',
    white: '#FFFFFF',
    gray: '#CCCCCC'
};

const CustomCalendar: React.FC<CustomCalendarProps> = ({
    startDate,
    endDate,
    onRangeSelect,
    minDate = new Date(),
    isRoundTrip,
}) => {

    // Función auxiliar para convertir Date a string 'YYYY-MM-DD'
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // --- Lógica CORE: Generar el objeto markedDates ---
    const markedDates = useMemo(() => {
        const marks: any = {};
        const startStr = startDate ? formatDate(startDate) : null;
        const endStr = endDate ? formatDate(endDate) : null;

        // 1. Caso: Solo fecha de inicio
        if (startStr) {
            marks[startStr] = {
                selected: true,
                startingDay: true,
                endingDay: !endStr, // Si no hay fin, es inicio y fin a la vez
                color: COLORS.primary,
                textColor: COLORS.text,
                customContainerStyle: { borderRadius: 8 }
            };
        }

        // 2. Caso: Rango completo (Inicio y Fin)
        if (startStr && endStr && isRoundTrip) {
            let currentDate = new Date(startDate!);
            const lastDate = new Date(endDate!);

            // Loop para rellenar los días intermedios
            while (currentDate <= lastDate) {
                const dateStr = formatDate(currentDate);
                const isStart = dateStr === startStr;
                const isEnd = dateStr === endStr;

                marks[dateStr] = {
                    selected: true,
                    color: (isStart || isEnd) ? COLORS.primary : COLORS.primaryLight,
                    textColor: COLORS.text,
                    startingDay: isStart,
                    endingDay: isEnd,
                };

                // Sumar 1 día
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        return marks;
    }, [startDate, endDate, isRoundTrip]);

    // --- Manejador de selección ---
    const onDayPress = (day: DateData) => {
        const selectedDate = new Date(day.dateString);

        // Ajuste de zona horaria simple para evitar problemas de día anterior
        // (Aseguramos que trabajamos a mediodía para evitar saltos por UTC)
        selectedDate.setHours(12, 0, 0, 0);

        if (!isRoundTrip) {
            onRangeSelect(selectedDate, null);
            return;
        }

        // Lógica de rango
        if (!startDate || (startDate && endDate)) {
            // Nuevo rango
            onRangeSelect(selectedDate, null);
        } else if (startDate && !endDate) {
            if (selectedDate < startDate) {
                // Si selecciona fecha anterior a inicio -> Nueva fecha inicio
                onRangeSelect(selectedDate, null);
            } else {
                // Cierra el rango
                onRangeSelect(startDate, selectedDate);
            }
        }
    };

    return (
        <View style={styles.container}>
            <Calendar
                // Configuración básica
                current={startDate ? formatDate(startDate) : formatDate(new Date())}
                minDate={formatDate(minDate)}
                onDayPress={onDayPress}
                firstDay={1} // Lunes
                enableSwipeMonths={true} // Swipe además de botones

                // Renderizado de flechas personalizadas (opcional, para que cuadre con tu diseño)
                renderArrow={(direction) => (
                    <Ionicons
                        name={direction === 'left' ? "chevron-back" : "chevron-forward"}
                        size={24}
                        color={COLORS.text}
                    />
                )}

                // Estilos y Marcado
                markingType={'period'} // IMPORTANTE para rangos visuales bonitos
                markedDates={markedDates}

                // Tema visual (para que coincida con tu CSS)
                theme={{
                    backgroundColor: COLORS.white,
                    calendarBackground: COLORS.white,
                    textSectionTitleColor: '#b6c1cd',
                    selectedDayBackgroundColor: COLORS.primary,
                    selectedDayTextColor: COLORS.text,
                    todayTextColor: COLORS.primary,
                    dayTextColor: '#2d4150',
                    textDisabledColor: '#d9e1e8',
                    arrowColor: COLORS.text,
                    disabledArrowColor: '#d9e1e8',
                    monthTextColor: COLORS.text,
                    indicatorColor: COLORS.primary,
                    textDayFontFamily: 'System', // O tu fuente personalizada
                    textMonthFontFamily: 'System',
                    textDayHeaderFontFamily: 'System',
                    textDayFontWeight: '300',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '300',
                    textDayFontSize: 16,
                    textMonthFontSize: 18,
                    textDayHeaderFontSize: 13
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingBottom: 10,
        // Eliminamos el flex: 1 para que no intente ocupar toda la pantalla verticalmente
        // ya que este calendario tiene altura fija
    },
});

export default CustomCalendar;