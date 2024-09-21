// #region Imports
import 'react-native-gesture-handler'
import React, { Component, useEffect } from 'react'
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
import { BridgeServer } from 'react-native-http-bridge-refurbished'
import DeviceInfo from 'react-native-device-info'

import { RootStackParamList, InternalState, Notification, Ask, HTTPImageRequest, HTTPImageFrom } from './types'

import { Context } from './components/context'

import HomeScreen from './src/HomeScreen'
import DetailScreen from "./src/DetailScreen";
import LogScreen from './src/logScreen'
import ComingData from "./src/ShowComingDatas"
import { NotifierWrapper, Notifier, Easing } from 'react-native-notifier'
import Gzip from 'rn-gzip'



const Stack = createStackNavigator<RootStackParamList>()


/**
 * アプリのエントリーポイント
 */
export default class App extends Component {

	public state: InternalState

	private AIRDROP_HTTP_PORT = 8771

	constructor(props: any) {
		super(props);

		this.state = {
			isScanning: false,
			selectedService: null,
			services: {} as { [key: string]: Service & { clientName: string, clientModel: string } },
			recivedDatas: [] as { from: string, bytes: number, data: Buffer, uri : string }[],
			logs: [],
			showLogs: false,
			image: null,
			senderData: {} as Ask,
			notification: {} as Notification,
			showsDetailDisplay: false
		}
	}

	// #region HTTP Client Server
	/**
	 * HTTPサーバーを起動します。
	 * 
	 * @returns 
	 */
	public httpServer() {
		const httpbridge = new BridgeServer("neardrop.local", true)
		httpbridge.listen(this.AIRDROP_HTTP_PORT);

		this.state.logs.push({
			emoji: '🔗',
			message: `Starting HTTP server on port ${this.AIRDROP_HTTP_PORT}`
		})

		httpbridge.get('/info', async (request, response) => {
			return ({
				status: "OK",
				data: {
					clientId: DeviceInfo.getUniqueId(),
					clientName: DeviceInfo.getModel(),
					clientModel: Platform.OS
				}
			})
		})

		httpbridge.get('/authorization', async (request, response) => {

		})

		httpbridge.post<Ask>("/Ask", async (request, response) => {

			const data = request.postData
			this.state.senderData = data as Ask

			return {
				"ReceiverComputerName": "Google Pixel 6a",
				"ReceiverModelName": "Pixel 6a"
			} as Ask
		})

		httpbridge.post<string>("/upload", async (request, response) => {
			const raw = request.postData as string
			console.log( raw )
			const unZip = Gzip.unzip(raw)
			const postJSONData = (JSON.parse(unZip)) as HTTPImageRequest

			const deviceInfomationfromHash = JSON.parse(
				Buffer.from(postJSONData.from, "base64").toString("utf-8")
			) as HTTPImageFrom

			const data = Buffer.from(postJSONData.uri.split(",")[1], "base64")
			this.state.logs.push({
				emoji: "⚠️",
				message: `Received ${data.byteLength} bytes of data from ${deviceInfomationfromHash.name}(${deviceInfomationfromHash.id})`
			})
			this.state.logs.push({
				emoji: '📨',
				message: `Received ${data.byteLength} bytes of data`
			})

			this.state.notification = {
				emoji: '📨',
				message: `Received ${data.byteLength} bytes of data`
			}

			this.state.recivedDatas.push({
				from: postJSONData.from,
				bytes: data.byteLength,
				data: data,
				uri : postJSONData.uri
			})

			Notifier.showNotification({
				title: 'データを受信しました',
				description: `データを${data.byteLength}バイト受信しました`,
				duration: 5000,
				showAnimationDuration: 800,
				showEasing: Easing.ease,
				hideEasing: Easing.ease,
			})

			return {
				"status": "OK"
			}
		})

		return httpbridge;
	}

	//#endregion

	setObjectState = (state: Partial<InternalState>) => {
		this.state.logs.push({
			"emoji": "🔄",
			"message": `State Changed: ${JSON.stringify(state)}`
		})
		this.setState({
			...state
		})
	}

	componentDidMount(): void {
		this.httpServer()
	}

	render(): React.ReactNode {
		return (
			<Context.Provider
				value={{
					...this.state,
					setObjectState: this.setObjectState
				}}
			>
				<NotifierWrapper>
					<NavigationContainer>
						<Stack.Navigator>
							<Stack.Screen
								name="デバイスの選択"
								component={HomeScreen}
							/>
							<Stack.Screen
								name="DetailScreen"
								component={DetailScreen}
							/>
							<Stack.Screen
								name="LogScreen"
								component={LogScreen}
							/>
							<Stack.Screen
								name="写真の保存"
								component={ComingData}
							/>
						</Stack.Navigator>
					</NavigationContainer>
				</NotifierWrapper>
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