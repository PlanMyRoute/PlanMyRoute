import type { MapPickerCoords } from './MapLocationPicker';

type Props = {
    visible: boolean;
    initialLocation?: MapPickerCoords | null;
    onLocationSelect: (coords: MapPickerCoords, address?: string) => void;
    onClose: () => void;
};

// Native stub — the real implementation lives in MapLocationPickerWeb.web.tsx
// Metro Bundler resolves the .web.tsx variant automatically on web.
export function MapLocationPickerWeb(_props: Props) {
    return null;
}
