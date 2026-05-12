import { useState } from 'react';
import { Coord } from '@/utils/tripValidation';

export type IntermediateStop = {
    id: string;
    name: string;
    address: string;
    coordinates: Coord | null;
    expectedArrivalDate: Date | null;
};

export function useTripIntermediateStops() {
    const [intermediateStops, setIntermediateStops] = useState<IntermediateStop[]>([]);

    const addStop = () => {
        setIntermediateStops(prev => [
            ...prev,
            {
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name: '',
                address: '',
                coordinates: null,
                expectedArrivalDate: null,
            },
        ]);
    };

    const removeStop = (id: string) => {
        setIntermediateStops(prev => prev.filter(s => s.id !== id));
    };

    const updateStop = (id: string, updates: Partial<Omit<IntermediateStop, 'id'>>) => {
        setIntermediateStops(prev =>
            prev.map(s => (s.id === id ? { ...s, ...updates } : s))
        );
    };

    const moveStop = (id: string, direction: 'up' | 'down') => {
        setIntermediateStops(prev => {
            const idx = prev.findIndex(s => s.id === id);
            if (idx === -1) return prev;
            if (direction === 'up' && idx === 0) return prev;
            if (direction === 'down' && idx === prev.length - 1) return prev;
            const next = [...prev];
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
            return next;
        });
    };

    const reset = () => setIntermediateStops([]);

    /** Replaces the entire list — used when restoring from a draft. */
    const initStops = (stops: IntermediateStop[]) => setIntermediateStops(stops);

    return {
        list: intermediateStops,
        addStop,
        removeStop,
        updateStop,
        moveStop,
        initStops,
        reset,
    };
}
