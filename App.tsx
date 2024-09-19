// #region Imports
import 'react-native-gesture-handler'
import React, { Component } from 'react'
import {
	Platform,
	StyleSheet,
	TouchableOpacity,
	Text,
	FlatList,
	RefreshControl,
	View,
	TextBase,
	ScrollView as RNScrollView,
} from 'react-native'
import Zeroconf, { Service } from 'react-native-zeroconf'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { Buffer } from 'buffer';

import { Ask } from './types/airdrop.ask';
import { Context } from './components/context'

const Stack = createStackNavigator()

import HomeScreen from './src/HomeScreen'
import DetailScreen from "./src/DetailScreen";
import { InternalState, Notification } from './types'
import LogScreen from './src/logScreen'
/**
 * アプリのエントリーポイント
 */
export default class App extends Component {

	public state: InternalState

	constructor(props: any) {
		super(props);

		this.state = {
			isScanning: false,
			selectedService: null,
			services: {} as { [key: string]: Service & { clientName: string, clientModel: string } },
			recivedDatas: {} as { from: string, bytes: number, data: Buffer }[],
			logs: [],
			showLogs: false,
			image: null,
			senderData: {} as Ask,
			notification: {} as Notification,
			showsDetailDisplay: false
		}
	}

	setObjectState = (state: Partial<InternalState>) => {
		this.setState({
			...state
		})
	}

	render(): React.ReactNode {
		return (
			<Context.Provider
				value={{
					...this.state,
					setObjectState: this.setObjectState
				}}
			>
				<NavigationContainer>
					<Stack.Navigator>
						<Stack.Screen
							name="デバイスの選択"
							//@ts-ignore
							component={HomeScreen}
						/>
						<Stack.Screen
							name="DetailScreen"
							//@ts-ignore
							component={DetailScreen}
						/>
						<Stack.Screen
							name="LogScreen"
							//@ts-ignore
							component={LogScreen}
						/>
					</Stack.Navigator>
				</NavigationContainer>
			</Context.Provider>
		)
	}
}

//#region Styles

const styles = StyleSheet.create({
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

//#endregion