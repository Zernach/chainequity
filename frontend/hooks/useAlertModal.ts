import { useState, useCallback } from 'react';
import { AlertType } from '../components/AlertModal';

interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
    title?: string;
    message: string;
    type?: AlertType;
    buttons?: AlertButton[];
}

interface AlertState extends AlertOptions {
    visible: boolean;
}

export function useAlertModal() {
    const [alertState, setAlertState] = useState<AlertState>({
        visible: false,
        message: '',
        type: 'info',
        buttons: [{ text: 'OK', style: 'default' }],
    });

    const showAlert = useCallback((options: AlertOptions) => {
        setAlertState({
            visible: true,
            title: options.title,
            message: options.message,
            type: options.type || 'info',
            buttons: options.buttons || [{ text: 'OK', style: 'default' }],
        });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertState(prev => ({ ...prev, visible: false }));
    }, []);

    // Convenience methods that match Alert.alert API
    const alert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
        showAlert({
            title,
            message: message || '',
            type: 'info',
            buttons,
        });
    }, [showAlert]);

    const success = useCallback((title: string, message?: string) => {
        showAlert({
            title,
            message: message || '',
            type: 'success',
        });
    }, [showAlert]);

    const error = useCallback((title: string, message?: string) => {
        showAlert({
            title,
            message: message || '',
            type: 'error',
        });
    }, [showAlert]);

    const warning = useCallback((title: string, message?: string) => {
        showAlert({
            title,
            message: message || '',
            type: 'warning',
        });
    }, [showAlert]);

    const confirm = useCallback((
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel?: () => void
    ) => {
        showAlert({
            title,
            message,
            type: 'confirm',
            buttons: [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: onCancel,
                },
                {
                    text: 'OK',
                    style: 'default',
                    onPress: onConfirm,
                },
            ],
        });
    }, [showAlert]);

    return {
        alertState,
        showAlert,
        hideAlert,
        alert,
        success,
        error,
        warning,
        confirm,
    };
}

