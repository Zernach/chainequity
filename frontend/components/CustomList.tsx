import type { LegacyRef } from 'react';
import React, { forwardRef } from 'react';
import { ScrollView, FlatList } from 'react-native-gesture-handler';
import type { FlatListProps, ScrollViewProps } from 'react-native';

export const CustomList = forwardRef<
    FlatList<any> | ScrollView,
    {
        scrollViewProps?: ScrollViewProps & { key?: string };
        flatListProps?: FlatListProps<any> & { key?: string };
        children?: React.ReactNode;
    }
>(({ scrollViewProps, flatListProps, children }, ref) => {
    if (flatListProps) {
        const { key, ...rest } = flatListProps;
        return (
            <FlatList
                {...rest}
                key={key}
                ref={ref as LegacyRef<FlatList<any>>}
                userSelect={'text'}
            >
                {children}
            </FlatList>
        );
    }
    if (scrollViewProps) {
        const { key, ...rest } = scrollViewProps;
        return (
            <ScrollView
                {...rest}
                key={key}
                ref={ref as LegacyRef<ScrollView>}
                userSelect={'text'}
            >
                {children}
            </ScrollView>
        );
    }
    return <>{children}</>;
});

CustomList.displayName = 'CustomList';

