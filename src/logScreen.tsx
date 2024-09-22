import React from "react";
import { Context } from "../components/context";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
	Text,
	View,
	ScrollView as RNScrollView,
    StyleSheet,
} from 'react-native'
import { 
	Button as PaperButton 
} from 'react-native-paper';
import { NativeStackScreenProps } from "react-native-screens/lib/typescript/native-stack/types";

import { RootStackParamList } from "../types";

export default class LogScreen extends React.Component<NativeStackScreenProps<RootStackParamList, 'LogScreen'>> {
    static contextType = Context;
    //@ts-ignore
    context!: React.ContextType<typeof Context>

    render() {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    {/*
                    <ApplicationBar closeMenuFunction={() => this.context.setObjectState({ showLogs: false })} customTitle='デバックログ' />
                    */}
                    <RNScrollView style={styles.logs} >
                        {this.context.logs.map((log, index) => (
                            <View style={styles.flexLog} key={"v" + index}>
                                <Text key={index} style={styles.logs}>{log.emoji}</Text>
                                <Text key={"k" + index} style={styles.json}>{log.message}</Text>
                            </View>
                        ))}
						<PaperButton icon="delete" mode='contained-tonal' onPress={() => this.context.setObjectState({ logs: [] })}>
                            ログをクリアする
                   		</PaperButton>
                    </RNScrollView>

                </SafeAreaView>
            </SafeAreaProvider>
        )
    }
}

const styles = StyleSheet.create({
	bottomButtonFixed : {
		position: 'absolute',
		bottom: 0,
		width: '100%'
	},
	udpadding: {
		paddingTop: 10,
		paddingBottom: 10
	},
	textWithIcon: {
		display: 'flex',
		flexDirection: 'row',
		alignContent: 'center',
		alignItems: 'center',
		textAlign: 'center',
		justifyContent: 'center',
		gap: 10,
		fontSize: 30
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
		fontWeight: "semibold",
		height: "90%"
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