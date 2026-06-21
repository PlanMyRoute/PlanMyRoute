import { MicrotextDark } from '@/components/customElements/CustomText';
import { Interest } from '@planmyroute/types';
import { TouchableOpacity, View } from 'react-native';

export type ExtendedInterest = Interest | 'shopping' | 'sports' | 'photography' | 'romantic' | 'religious' | 'history';

export const INTEREST_CATEGORIES: ExtendedInterest[] = [
    'nature',
    'cultural',
    'history',
    'leisure',
    'gastronomic',
    'nightlife',
    'welfare',
    'adventure',
    'sports',
    'beach',
    'family',
    'shopping',
    'photography',
    'romantic',
    'religious',
];

export const INTEREST_LABELS: Record<ExtendedInterest, string> = {
    nature: 'Naturaleza',
    cultural: 'Cultura',
    history: 'Historia',
    leisure: 'Ocio',
    gastronomic: 'Gastronomía',
    nightlife: 'Vida nocturna',
    welfare: 'Bienestar',
    adventure: 'Aventura',
    sports: 'Deportes',
    beach: 'Playa',
    family: 'Familia',
    shopping: 'Compras',
    photography: 'Fotografía',
    romantic: 'Romántico',
    religious: 'Religioso',
};

export const DB_INTERESTS: ReadonlySet<string> = new Set<Interest>([
    'nature', 'cultural', 'leisure', 'gastronomic', 'nightlife',
    'welfare', 'adventure', 'beach', 'family',
]);

export function splitInterests(selected: ExtendedInterest[]): {
    dbInterests: Interest[];
    promptKeywords: string[];
} {
    const dbInterests: Interest[] = [];
    const promptKeywords: string[] = [];
    for (const i of selected) {
        if (DB_INTERESTS.has(i)) {
            dbInterests.push(i as Interest);
        } else {
            promptKeywords.push(INTEREST_LABELS[i]);
        }
    }
    return { dbInterests, promptKeywords };
}

interface InterestSelectorProps {
    selectedInterests: ExtendedInterest[];
    onInterestsChange: (interests: ExtendedInterest[]) => void;
    multiple?: boolean;
    extended?: boolean;
}

export const InterestSelector = ({
    selectedInterests,
    onInterestsChange,
    multiple = true,
    extended = true,
}: InterestSelectorProps) => {
    const categories = extended
        ? INTEREST_CATEGORIES
        : INTEREST_CATEGORIES.filter((i) => DB_INTERESTS.has(i));

    const toggleInterest = (interest: ExtendedInterest) => {
        if (multiple) {
            const newInterests = selectedInterests.includes(interest)
                ? selectedInterests.filter((i) => i !== interest)
                : [...selectedInterests, interest];
            onInterestsChange(newInterests);
        } else {
            onInterestsChange([interest]);
        }
    };

    return (
        <View className="flex-row flex-wrap gap-2 justify-center">
            {categories.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                    <TouchableOpacity
                        key={interest}
                        onPress={() => toggleInterest(interest)}
                        className={`px-4 py-2.5 rounded-full border-2 ${isSelected
                            ? 'bg-primary-yellow border-primary-yellow'
                            : 'bg-white border-gray-200'
                            }`}
                        activeOpacity={0.7}
                    >
                        <MicrotextDark
                            style={{ color: isSelected ? '#202020' : '#888888' }}
                        >
                            {INTEREST_LABELS[interest]}
                        </MicrotextDark>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
