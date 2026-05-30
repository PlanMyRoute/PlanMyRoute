import CustomAlert, { AlertAction, AlertType } from '@/components/customElements/CustomAlert';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

export interface AlertOptions {
    title: string;
    message: string;
    type?: AlertType;
    actions?: AlertAction[];
    blocking?: boolean;
    onDismiss?: () => void;
}

interface AlertContextValue {
    showAlert: (options: AlertOptions) => void;
    closeAlert: () => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
    const [options, setOptions] = useState<AlertOptions | null>(null);
    // Keep onDismiss in a ref so closing doesn't trigger re-renders
    const onDismissRef = useRef<(() => void) | undefined>(undefined);

    const showAlert = useCallback((opts: AlertOptions) => {
        onDismissRef.current = opts.onDismiss;
        setOptions(opts);
    }, []);

    const closeAlert = useCallback(() => {
        setOptions(null);
        onDismissRef.current?.();
        onDismissRef.current = undefined;
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert, closeAlert }}>
            {children}
            <CustomAlert
                visible={options !== null}
                title={options?.title ?? ''}
                message={options?.message ?? ''}
                type={options?.type ?? 'info'}
                actions={options?.actions}
                blocking={options?.blocking}
                onClose={closeAlert}
            />
        </AlertContext.Provider>
    );
}

export function useAlert(): AlertContextValue {
    const ctx = useContext(AlertContext);
    if (!ctx) throw new Error('useAlert must be used inside <AlertProvider>');
    return ctx;
}
