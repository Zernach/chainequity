import React from 'react';
import {
    Modal as RNModal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
} from 'react-native';
import { theme } from '../constants';
import { CustomList } from './CustomList';

interface ModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    showCloseButton?: boolean;
    style?: ViewStyle;
}

export default function Modal({
    visible,
    onClose,
    title,
    children,
    footer,
    showCloseButton = true,
    style,
}: ModalProps) {
    return (
        <RNModal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <View style={[styles.container, style]}>
                    {/* Header */}
                    {(title || showCloseButton) && (
                        <View style={styles.header}>
                            {title && <Text style={styles.title}>{title}</Text>}
                            {showCloseButton && (
                                <TouchableOpacity
                                    onPress={onClose}
                                    style={styles.closeButton}
                                    activeOpacity={theme.opacity.hover}
                                >
                                    <Text style={styles.closeIcon}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Content */}
                    <CustomList scrollViewProps={{ style: styles.content, showsVerticalScrollIndicator: false }}>
                        {children}
                    </CustomList>

                    {/* Footer */}
                    {footer && <View style={styles.footer}>{footer}</View>}
                </View>
            </View>
        </RNModal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: theme.colors.background.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.base,
    },
    container: {
        backgroundColor: theme.colors.surface.default,
        borderRadius: theme.radius.lg,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80%',
        ...theme.shadow.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.base,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border.default,
    },
    title: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        flex: 1,
    },
    closeButton: {
        padding: theme.spacing.sm,
        marginLeft: theme.spacing.md,
    },
    closeIcon: {
        fontSize: theme.typography.fontSize['2xl'],
        color: theme.colors.text.secondary,
    },
    content: {
        padding: theme.spacing.base,
    },
    footer: {
        padding: theme.spacing.base,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border.default,
    },
});

