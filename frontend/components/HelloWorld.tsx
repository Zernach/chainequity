import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

export default function HelloWorld() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Hello World! 👋</Text>
            <Text style={styles.subtitle}>Welcome to ChainEquity</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 10,
        marginVertical: 10,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.text.secondary,
    },
});

