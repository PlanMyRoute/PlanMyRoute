import { MicrotextDark, TextRegular } from '@/components/customElements/CustomText';
import { ScrollView, TouchableOpacity, View } from 'react-native';

export interface DayInfo {
    day: number;
    stopCount: number;
    distanceKm?: string;
    durationStr?: string;
    isToday?: boolean;
    isPast?: boolean;
}

interface DaySelectorProps {
    days: DayInfo[];
    selectedDay: number | null;
    onSelect: (day: number | null) => void;
    totalStops?: number;
}

export function DaySelector({ days, selectedDay, onSelect, totalStops }: DaySelectorProps) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
        >
            {/* Pill "Todo el viaje" */}
            <TouchableOpacity
                onPress={() => onSelect(null)}
                activeOpacity={0.7}
                className={`rounded-full px-4 py-2 items-center justify-center ${
                    selectedDay === null
                        ? 'bg-primary'
                        : 'bg-white border border-neutral/30'
                }`}
            >
                <TextRegular className="text-dark">Todo el viaje</TextRegular>
                {totalStops !== undefined && (
                    <MicrotextDark className="text-neutral mt-0.5">{totalStops} paradas</MicrotextDark>
                )}
            </TouchableOpacity>

            {/* Pills por día */}
            {days.map((info) => {
                const isSelected = selectedDay === info.day;
                return (
                    <TouchableOpacity
                        key={info.day}
                        onPress={() => onSelect(info.day)}
                        activeOpacity={0.7}
                        className={`rounded-full px-4 py-2 items-center justify-center ${
                            isSelected
                                ? 'bg-primary'
                                : info.isPast
                                ? 'bg-neutral/10 border border-neutral/20'
                                : 'bg-white border border-neutral/30'
                        }`}
                    >
                        <TextRegular className={`text-dark ${info.isPast && !isSelected ? 'opacity-50' : ''}`}>
                            Día {info.day}
                        </TextRegular>
                        {info.distanceKm && (
                            <MicrotextDark className={`mt-0.5 ${info.isPast && !isSelected ? 'text-neutral/50' : 'text-neutral'}`}>
                                {info.distanceKm} km
                            </MicrotextDark>
                        )}
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}
