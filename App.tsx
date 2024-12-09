// #region Imports
import 'react-native-gesture-handler'
import React, { Component } from 'react'
import { Platform } from 'react-native'
import type { Service } from 'react-native-zeroconf'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { Buffer } from 'buffer';
import { BridgeServer } from 'react-native-http-bridge-refurbished'
import DeviceInfo from 'react-native-device-info'

import { RootStackParamList, InternalState, Notification, HTTPImageFrom, HTTPBufferRequest } from './types'

import { Context } from './components/context'

import HomeScreen from './src/HomeScreen.new'
import DetailScreen from "./src/DetailScreen.new";
import LogScreen from './src/logScreen'
import ComingData from "./src/ShowComingDatas"
import { NotifierWrapper, Notifier } from 'react-native-notifier'
import nfcManager, { Ndef, NfcEvents, NfcManager, NfcTech, OnNfcEvents } from 'react-native-nfc-manager'
import { NetworkInfo } from 'react-native-network-info'



const Stack = createStackNavigator<RootStackParamList>()


/**
 * アプリのエントリーポイント
 */
export default class App extends Component {

	public state: InternalState & {
		ip: string
	}

	private AIRDROP_HTTP_PORT = 8771

	private __httpServer: BridgeServer | undefined;

	constructor(props: any) {
		super(props);

		this.state = {
			isScanning: false,
			selectedService: null,
			services: {} as { [key: string]: Service & { clientName: string, clientModel: string } },
			recivedDatas: [] as { from: string, bytes: number, data: Buffer, uri: string }[],
			logs: [],
			showLogs: false,
			image: null,
			notification: {} as Notification,
			showsDetailDisplay: false,
			recivedShards: [] as HTTPBufferRequest[],
			ip: ""
		}

		this.__httpServer = void 0;
	}

	public async startNFC() {
		// NFCをスタートする
		if (!nfcManager.isSupported()) return;
		nfcManager.start();
		await nfcManager.requestTechnology(
			[ NfcTech.Ndef],
			{
				alertMessage: "Ready to read NDEF message"
			}
		);
		const pages = await nfcManager.getTag(); 
		console.log(pages);


		if (Platform.OS === 'android') {
			nfcManager.setEventListener(
				NfcEvents.StateChanged,
				() => {
					nfcManager.cancelTechnologyRequest().catch(() => 0);
				},
			);
		}

		/**
		 * 
		 */


		await nfcManager.registerTagEvent().catch(
			(err) => {
				console.log("registerTagEvent error", err)
				nfcManager.unregisterTagEvent().catch(() => { })
			}
		)
	}
	// #region HTTP Client Server
	/**
	 * HTTPサーバーを起動します。
	 * 
	 * @returns 
	 */
	public httpServer() {
		// 既存のサーバーが起動していたら停止させる
		BridgeServer.server instanceof BridgeServer && BridgeServer.server.stop();

		const httpbridge = new BridgeServer("neardrop.local")
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

		httpbridge.post("/ask", async (request, response) => {

			return {
				"status": "OK",
				"data": {
					message: "wait for grand"
				}
			}
		})

		httpbridge.post("/ask/grand", async (request, response) => {
			const data = JSON.parse(JSON.stringify(request.postData)) as { datahash: string, grand: boolean }
			const grand = data.grand
			const from = data.datahash

			this.state.logs.push({
				emoji: '🔑',
				message: `Grand ${grand ? "🔓" : "🔒"} access to ${from}`
			})

			return {
				"status": "OK",
				"data": {
					message: "granded"
				}
			}
		})

		httpbridge.post<string>("/upload/shard", async (request, response) => {
			const raw = request.postData as string;
			const unZip = raw
			if (typeof unZip === "undefined") {
				this.state.logs.push({
					emoji: "📨",
					message: `recived data is undefined`
				})

				return {
					"status": "NG"
				}
			}
			this.state.logs.push({
				emoji: "📨",
				message: `Received ${unZip.length} byte`
			})
			const postJSONData =
				typeof unZip !== "object" ? (JSON.parse(unZip)) as HTTPBufferRequest & { data: string } :
					unZip as HTTPBufferRequest & { data: string }

			this.state.logs.push({
				emoji: "📨",
				message: `from ${postJSONData.from}, Received ${postJSONData.shardIndex + 1} of ${postJSONData.totalShards} shards`
			})

			const deviceInfomationfromHash = JSON.parse(
				postJSONData ? Buffer.from(postJSONData.from, "base64").toString("utf-8") : JSON.stringify({ name: "unknown", id: "unknown" })
			) as HTTPImageFrom

			console.log(`Recieve : ${Buffer.from(postJSONData.uri.split(',').map(v => +v)).byteLength} byte`)

			this.state.recivedShards.push({
				from: postJSONData.from,
				shardIndex: postJSONData.shardIndex,
				data: Buffer.from(postJSONData.uri.split(',').map(v => +v)),
				uri: "nullvalue",
				totalShards: postJSONData.totalShards,
				type: "base64-shards",
				imgType: postJSONData.type,
				status: "Shards"
			})

			console.log(`-----> Received ${postJSONData.shardIndex + 1} of ${postJSONData.totalShards} shards from ${deviceInfomationfromHash.name}(${deviceInfomationfromHash.id})`)

			if (this.state.recivedShards.length === postJSONData.totalShards) {
				console.log(Math.round(new Date().getTime() / 1000))

				this.state.logs.push({
					emoji: "📨",
					message: `Received ${postJSONData.totalShards} shards from ${deviceInfomationfromHash.name}(${deviceInfomationfromHash.id})`
				})
				Notifier.showNotification({
					title: 'シャードを受信し終わりました！',
					description: `Received ${postJSONData.totalShards} shards from ${deviceInfomationfromHash.name}(${deviceInfomationfromHash.id})`,
					onPress: () => {
						//naviga.navigate("写真の保存")
					}
				})

				const shards = this.state.recivedShards.filter((shard) => shard.from === postJSONData.from)
				const data = Buffer.concat(
					[...shards.sort((a, b) => a.shardIndex - b.shardIndex).map((shard) => shard.data)],
				)
				console.log(`-----> Received ${data.byteLength} bytes of data from ${deviceInfomationfromHash.name}(${deviceInfomationfromHash.id})`)
				const toBase64URI = `data:image/png;base64,${data.toString("base64")}`

				this.state.recivedShards = this.state.recivedShards.filter(
					v => v.from !== postJSONData.from
				)

				this.state.recivedDatas.push({
					from: postJSONData.from,
					bytes: data.byteLength,
					data: data,
					uri: toBase64URI
				})
			}


			return {
				"status": "OK"
			}
		})

		return httpbridge;
	}

	//#endregion

	/**
	 * Global Stateを更新します。
	 * @param state {Partial<InternalState>} 更新するState
	 * @returns {void}
	 * 
	 * @final
	 */
	setObjectState = (state: Partial<InternalState>) => {
		this.setState({
			...state
		})
	}

	componentDidMount(): void {
		this.__httpServer = this.httpServer()
		this.startNFC()
		NetworkInfo.getIPV4Address().then(v => {
			this.setState({
				ip: v
			}) // 自身の追跡用にIPを決定させておく
		})
	}

	componentWillUnmount(): void {
		nfcManager.setEventListener(NfcEvents.DiscoverTag, null)
		nfcManager.setEventListener(NfcEvents.DiscoverBackgroundTag, null)
		nfcManager.unregisterTagEvent().catch(() => { });
		nfcManager.cancelTechnologyRequest().catch(() => { });
		if (Platform.OS === "ios") {

		}
		this.__httpServer instanceof BridgeServer && this.__httpServer.stop()
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