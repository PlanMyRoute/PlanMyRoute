import { useState } from 'react';
import { Interest } from '@planmyroute/types';

export function useTripPreferencesForm(initialInterests: Interest[] = []) {
    const [selectedInterests, setSelectedInterests] = useState<Interest[]>(initialInterests);
    const [travelStyle, setTravelStyle] = useState<'explorer' | 'balanced' | 'sedentary'>('balanced');

    const reset = () => {
        setSelectedInterests([]);
        setTravelStyle('balanced');
    };

    return {
        selectedInterests, setSelectedInterests,
        travelStyle, setTravelStyle,
        reset,
    };
}
