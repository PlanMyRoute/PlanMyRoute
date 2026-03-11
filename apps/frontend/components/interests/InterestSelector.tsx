import { MicrotextDark } from '@/components/customElements/CustomText';
import { Interest } from '@planmyroute/types';
import { TouchableOpacity, View } from 'react-native';

export const INTEREST_CATEGORIES: Interest[] = [
    'nature',
    'cultural',
    'leisure',
    'gastronomic',
    'nightlife',
    'welfare',
    'adventure',
    'beach',
    'family',
];

export const INTEREST_LABELS: Record<Interest, string> = {
    nature: 'Naturaleza',
    cultural: 'Cultura',
    leisure: 'Ocio',
    gastronomic: 'Gastronomía',
    nightlife: 'Vida nocturna',
    welfare: 'Bienestar',
    adventure: 'Aventura',
    beach: 'Playa',
    family: 'Familia',
};

interface InterestSelectorProps {
    selectedInterests: Interest[];
    onInterestsChange: (interests: Interest[]) => void;
    multiple?: boolean; // Si es true, permite seleccionar múltiples; si es false, solo uno
}

export const InterestSelector = ({
    selectedInterests,
    onInterestsChange,
    multiple = true,
}: InterestSelectorProps) => {
    const toggleInterest = (interest: Interest) => {
        if (multiple) {
            // Modo múltiple: agregar/quitar de la lista
            const newInterests = selectedInterests.includes(interest)
                ? selectedInterests.filter((i) => i !== interest)
                : [...selectedInterests, interest];
            onInterestsChange(newInterests);
        } else {
            // Modo único: reemplazar la selección
            onInterestsChange([interest]);
        }
    };

    return (
        <View className="flex-row flex-wrap gap-2 justify-center">
            {INTEREST_CATEGORIES.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                    <TouchableOpacity
                        key={interest}
                        onPress={() => toggleInterest(interest)}
                        className={`px-4 py-2.5 rounded-full border-2 ${isSelected
                            ? 'bg-primary-yellow border-primary-yellow'
                            : 'bg-white border-neutral-gray/30'
                            }`}
                        activeOpacity={0.7}
                    >
                        <MicrotextDark
                            className={isSelected ? 'text-dark-black' : 'text-neutral-gray'}
                        >
                            {INTEREST_LABELS[interest]}
                        </MicrotextDark>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
