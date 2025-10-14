import { NativeStackScreenProps } from "react-native-screens/lib/typescript/native-stack/types";
import { RootStackParamList } from "../types";
import { Component, ContextType } from "react";
import { Context } from "../components/context";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Icon, ListItem, Text } from "react-native-elements";
import React from "react"
import { FlatList, RefreshControl } from "react-native-gesture-handler";
import { ActivityIndicator } from "react-native-paper";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default class SelectSenderScreen extends Component<
    NativeStackScreenProps< RootStackParamList, 'SelectSenderScreen' >
> {

    /**
     * 共有Context
     */
    static context = Context;
    /**
     * 実装Context
     */
    // @ts-ignore
    context !: ContextType<typeof Context>


    
    private renderRow({ item, index }: { item: string, index: number }) {
        const { name, fullName, host, addresses, clientModel, clientName } = this.context.services[item];

        return (
            <TouchableOpacity
                key={index}
                onPress={() => {
                    this.context.setObjectState({
                        selectedService: host
                    });
                    this.props.navigation.navigate('DetailScreen')
                }}
                style={[
                    styles.textWithIcon, styles.upadding
                ]}
            >
                <Icon name="smartphone" size={35} />
                <ListItem.Content>
                    <ListItem.Title style={styles.titleButSmall}>{clientName ?? fullName.split('.')[0]}</ListItem.Title>
                    <ListItem.Subtitle>{fullName} / {addresses.join(',')}</ListItem.Subtitle>
                </ListItem.Content>
            </TouchableOpacity>
        )
    }


    render() {
        const { services, selectedService, isScanning } = this.context

        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    <Text style={styles.title}> 送信する相手を選択する </Text>
                    <View style={styles.flexColumn}>
                        {
                            isScanning ? (
                                <>
                                    <View style={styles.textWithIconNotBackground}>
                                        <ActivityIndicator size="small" />
                                        <Text>付近のデバイスを検索中</Text>
                                    </View>
                                </>
                            ) : (
                                <>
                                    <FlatList
                                        data={Object.keys(services)}
                                        renderItem={(item) => this.renderRow(item)}
                                        keyExtractor={key => key}
                                        refreshControl={
                                            <RefreshControl
                                                refreshing={isScanning}
                                                onRefresh={() => this.context.refreshZerocnf()}
                                                tintColor="skyblue"
                                            />
                                        }
                                    />
                                </>
                            )
                        }
                    </View>
                </SafeAreaView>
            </SafeAreaProvider>
        )
    }
}

const styles = StyleSheet.create({
    title: {
        fontSize: 30,
        paddingTop: 10,
        paddingBottom: 10,
    },
    titleButSmall: {
        fontSize: 20,
    },
    flexColumn: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
    },
    upadding: {
        paddingTop: 10,
    },
    udpadding: {
        paddingTop: 10,
        paddingBottom: 10
    },
    textWithIconNotBackground: {
        display: 'flex',
        flexDirection: 'row',
        alignContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        gap: 10,
        fontSize: 30,
    },
    textWithIcon: {
        display: 'flex',
        flexDirection: 'row',
        alignContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        gap: 10,
        fontSize: 30,
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 10
    },

    textWithIconSizeFree: {
        padding: 10,
        display: 'flex',
        flexDirection: 'row',
        alignContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    container: {
        flex: 1,
        marginTop: 10,
        marginLeft: 10,
        marginRight: 10,
        marginBottom: 10,
    },
    closeButton: {
        padding: 20,
        textAlign: 'center',
    },
    json: {
        padding: 6,
        fontWeight: "bold",
        fontSize: 15,
    },
    logs: {
        padding: 3,
        fontSize: 20,
        fontWeight: "semibold"
    },
    state: {
        fontSize: 20,
        textAlign: 'center',
        margin: 30,
    },
    flexLog: {
        display: 'flex',
        flexDirection: "row",
        alignContent: "center"
    }
})

SelectSenderScreen.contextType = Context;