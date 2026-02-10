import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { ChevronLeft, RefreshCw, Database } from 'lucide-react-native';
import db from '../../lib/database';

export default function DatabaseViewerScreen({ navigation }: any) {
    const [activeTable, setActiveTable] = useState('users');
    const [data, setData] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);

    const tables = ['users', 'health_entries', 'moods', 'streaks', 'achievements'];

    useEffect(() => {
        fetchData(activeTable);
    }, [activeTable]);

    const fetchData = async (table: string) => {
        try {
            const database = db.getDB();
            const result = await database.getAllAsync(`SELECT * FROM ${table} ORDER BY rowid DESC LIMIT 50`);
            setData(result);
            if (result.length > 0) {
                setColumns(Object.keys(result[0] as object));
            } else {
                setColumns([]);
            }
        } catch (e) {
            console.error(e);
            setData([]);
        }
    };

    const renderHeader = () => (
        <View className="flex-row bg-slate-800 p-2 border-b border-slate-700">
            {columns.map((col) => (
                <Text key={col} className="text-teal-400 font-bold w-32 mr-2 text-xs" numberOfLines={1}>
                    {col}
                </Text>
            ))}
        </View>
    );

    const renderItem = ({ item }: { item: any }) => (
        <View className="flex-row p-2 border-b border-slate-800/50">
            {columns.map((col) => (
                <Text key={col} className="text-slate-300 w-32 mr-2 text-xs" numberOfLines={1}>
                    {typeof item[col] === 'object' ? JSON.stringify(item[col]) : String(item[col])}
                </Text>
            ))}
        </View>
    );

    return (
        <ScreenLayout gradientBackground>
            {/* Header */}
            <View className="p-4 pt-2 flex-row items-center justify-between">
                <View className="flex-row items-center space-x-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold">DB Viewer</Text>
                </View>
                <TouchableOpacity onPress={() => fetchData(activeTable)} className="p-2 bg-white/10 rounded-lg">
                    <RefreshCw color="white" size={20} />
                </TouchableOpacity>
            </View>

            {/* Table Selector */}
            <View className="px-4 mb-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
                    {tables.map((table) => (
                        <TouchableOpacity
                            key={table}
                            onPress={() => setActiveTable(table)}
                            className={`px-4 py-2 rounded-full ${activeTable === table ? 'bg-teal-500' : 'bg-slate-700'}`}
                        >
                            <Text className="text-white font-medium capitalize">{table.replace('_', ' ')}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Data Table */}
            <View className="flex-1 bg-slate-900/80 mx-4 mb-8 rounded-xl overflow-hidden border border-slate-700">
                <ScrollView horizontal>
                    <View>
                        {renderHeader()}
                        <FlatList
                            data={data}
                            keyExtractor={(_, index) => index.toString()}
                            renderItem={renderItem}
                            scrollEnabled={false} // Use parent scroll
                        />
                        {data.length === 0 && (
                            <View className="p-8 items-center">
                                <Database color="#64748b" size={48} />
                                <Text className="text-slate-500 mt-4">No records found</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </ScreenLayout>
    );
}
