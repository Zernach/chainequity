import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants';
import Modal from './Modal';
import Button from './Button';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface AlertModalProps {
    visible: boolean;
    title?: string;
    message: string;
    type?: AlertType;
    buttons?: AlertButton[];
    onClose: () => void;
}

export default function AlertModal({
    visible,
    title,
    message,
    type = 'info',
    buttons = [{ text: 'OK', style: 'default' }],
    onClose,
}: AlertModalProps) {
    const handleButtonPress = (button: AlertButton) => {
        button.onPress?.();
        onClose();
    };

    const getIconForType = () => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'warning':
                return '⚠';
            case 'confirm':
                return '?';
            default:
                return 'ℹ';
        }
    };

    const getColorForType = () => {
        switch (type) {
            case 'success':
                return theme.colors.success.default;
            case 'error':
                return theme.colors.error.default;
            case 'warning':
                return theme.colors.warning.default;
            default:
                return theme.colors.info.default;
        }
    };

    return (
        <Modal
            visible={visible}
            onClose={onClose}
            showCloseButton={false}
            style={styles.modal}
        >
            <View style={styles.content}>
                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: getColorForType() + '20' }]}>
                    <Text style={[styles.icon, { color: getColorForType() }]}>
                        {getIconForType()}
                    </Text>
                </View>

                {/* Title */}
                {title && <Text style={styles.title}>{title}</Text>}

                {/* Message */}
                <Text style={styles.message}>{message}</Text>

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                    {buttons.map((button, index) => {
                        let variant: 'primary' | 'secondary' | 'danger' = 'primary';
                        if (button.style === 'cancel') {
                            variant = 'secondary';
                        } else if (button.style === 'destructive') {
                            variant = 'danger';
                        }

                        return (
                            <Button
                                key={index}
                                title={button.text}
                                onPress={() => handleButtonPress(button)}
                                variant={variant}
                                style={[
                                    styles.button,
                                    buttons.length > 1 && index < buttons.length - 1 && styles.buttonSpacing
                                ]}
                            />
                        );
                    })}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modal: {
        maxWidth: 400,
    },
    content: {
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    icon: {
        fontSize: 32,
        fontWeight: theme.typography.fontWeight.bold,
    },
    title: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    message: {
        fontSize: theme.typography.fontSize.md,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
        lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.md,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: theme.spacing.sm,
    },
    button: {
        flex: 1,
    },
    buttonSpacing: {
        marginRight: theme.spacing.sm,
    },
});

