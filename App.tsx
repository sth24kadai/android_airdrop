// #region Imports
import 'react-native-gesture-handler'
import React from 'react'
import { Platform } from 'react-native'
import type { Service } from 'react-native-zeroconf'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { Buffer } from 'buffer';
import { BridgeServer } from 'react-native-http-bridge-refurbished'
import DeviceInfo from 'react-native-device-info'
import { NotifierWrapper, Notifier } from 'react-native-notifier'
import { NetworkInfo } from 'react-native-network-info'
import Zeroconf from 'react-native-zeroconf'

import { 
	RootStackParamList, 
	InternalState, 
	Notification, 
	HTTPImageFrom, 
	HTTPBufferRequest 
} from './types'
import { 
	Context, 
	ShardSender
} from './components'
import {
	DetailScreen,
	LogScreen,
	ShowComingDatas as ComingData,
	SelectSenderScreen,
	SelectImageInitScreen,
	QRCodeScannedScreen,
	ScanQRCodes as QR,
} from './src'



const Stack = createStackNavigator<RootStackParamList>()

const zeroconf = new Zeroconf()
/**
 * アプリのエントリーポイント
 */
export default class App extends ShardSender<null> {
	
	public state: InternalState & {
		ip: string
	}

	private __httpServer: BridgeServer | undefined;
	public readonly HTTP_PORT: number = 8771
	private timeout: NodeJS.Timeout | null = null;


	constructor(props: any) {
		super(props);

		this.state = {
			isScanning: false,
			selectedService: null,
			services: {} as { [key: string]: Service & { clientName: string, clientModel: string } },
			recivedDatas: [] as { from: string, bytes: number, data: Buffer, uri: string, uniqueGroupIndex: string }[],
			logs: [],
			showLogs: false,
			image: null,
			notification: {} as Notification,
			showsDetailDisplay: false,
			recivedShards: [] as HTTPBufferRequest[],
			ip: "",
			sentShards: [] as HTTPBufferRequest[],
		}

		this.__httpServer = void 0;
	}

	private async getDeviceName(service: Service) {
		this.state.logs.push({
			emoji: '🔍',
			message: `Fetching to http://${service.host}:${this.HTTP_PORT}/info`
		})
		const response = await fetch(`http://${service.host}:${this.HTTP_PORT}/info`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json"
				}
			}
		).catch((err) => {
			this.state.logs.push({ emoji: '🤬', message: `Failed to fetch. Fetch promise was not establish.` })
			this.state.logs.push({ emoji: '🤬', message: `Stack trase` })
			this.state.logs.push({ emoji: '🤬', message: err })
			
			Notifier.showNotification({
				title: "デバイスの詳細取得に失敗しました。",
				description: `詳細： ${service.host}の取得に失敗しました。\n 原因：${err}`,
			})

			return null;
		})

		if (!(response instanceof Response)) return null;
		if (response.ok) {
			const data = await response.json() as { status: string, data: { clientId: string, clientName: string, clientModel: string } };
			return data;
		} else {
			Notifier.showNotification({
				title: "デバイスの詳細取得に失敗しました。",
				description: `詳細：相手サーバーがレスポンスエラーを発生させました。`
			})
		}

		return null;
	}

	private get random8BitArrayGenerate(): Uint8Array {
        const randomNumbers: number[] = [];

        for (let i = 0; i < 6; i++) {
            randomNumbers.push(
                Math.floor(
                    Math.random() * 256
                )
            )
        }

        return Uint8Array.from(randomNumbers)
    }

	private mDNSEventHandlers() {

		console.log("mDNS Event Handlers")
		/* mDNSサービスを開始 */
		zeroconf.publishService(
			/* サービス名 */
			'FC9F5ED42C8A',
			/* プロトコル */
			'tcp',
			/* ドメイン */
			'local',
			/* ホスト名 */
			Buffer.from(this.random8BitArrayGenerate).toString('base64'),
			/* 使用ポート */
			5353
		)

		zeroconf.on('start', () => {
			this.setObjectState({ isScanning: true })
			this.state.logs.push({
				emoji: '🔍',
				message: 'Started scanning and lunching the mDNS service...'
			})

		})

		zeroconf.on('stop', () => {
			this.setObjectState({ isScanning: false })
			this.state.logs.push({
				emoji: '🛑',
				message: 'Stopped scanning'
			})
		})

		zeroconf.on('update', () => {
			this.state.logs.push({
				emoji: '🔄',
				message: 'Updating Data...'
			})
		})

		zeroconf.on('resolved', async service => {
			this.state.logs.push({
				emoji: '🐉',
				message: `Resolved ${service.name} (${service.host})`
			})
			this.state.logs.push({
				emoji: '🔗',
				message: JSON.stringify(service)
			})

			const deviceName = await this.getDeviceName(service)
			if (deviceName !== null) {
				this.state.logs.push({
					emoji: '📱',
					message: `Fetch Success: ${JSON.stringify(deviceName.data.clientId)} -  ${deviceName.data.clientName} (${deviceName.data.clientModel})`
				})
			}

			if (deviceName === null) return;

			const newService = Object.assign(service, deviceName !== null ? deviceName.data : {}) as Service & { clientName: string, clientModel: string }

			this.setObjectState({
				services: {
					...this.state.services,
					[service.host]: newService,
				},
			})
		})


		zeroconf.on('error', err => {
			this.setObjectState({ isScanning: false })
			this.state.logs.push({
				emoji: '🚨',
				message: `Error: ${err}`
			})
		})
	}

	public getFileTypeFromBuffer(buffer: Uint8Array): string | null {
        const uint8arr = new Uint8Array(buffer)

        const len = 4
        if (uint8arr.length >= len) {
            let signatureArr = new Array(len)
            for (let i = 0; i < len; i++)
                signatureArr[i] = (new Uint8Array(buffer))[i].toString(16)
            const signature = signatureArr.join('').toUpperCase()

            switch (signature) {
                case '89504E47':
                    return 'image/png'
                case '47494638':
                    return 'image/gif'
                case '25504446':
                    return 'application/pdf'
                case 'FFD8FFDB':
                case 'FFD8FFE0':
                    return 'image/jpeg'
                case '504B0304':
                    return 'application/zip'
                default:
                    return null
            }
        }
        return null

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
		httpbridge.listen(this.HTTP_PORT);


		this.state.logs.push({
			emoji: '🔗',
			message: `Starting HTTP server on port ${this.HTTP_PORT}`
		})

		httpbridge.get('/info', async (request, response) => {
			return ({
				status: "OK",
				data: {
					version: "R1",
					clientId: DeviceInfo.getUniqueId(),
					clientName: DeviceInfo.getModel(),
					clientModel: Platform.OS
				}
			})
		})

		httpbridge.put('/stream', async ( request, response ) => {
			console.log( request )
			if( typeof this.state.image === "undefined" || this.state.image === null ){
				return {
					status: "NG",
					data: {
						message: "No Image"
					}
				}
			}

			const unZip = request.postData as string;

			const ipData =
				typeof unZip !== "object" ? (JSON.parse(unZip)) as { ip : string } :
					unZip as { ip : string }

			const imageBuffers = await this.getAllImages( this.state.image );
			const askResponse = await fetch(`http://${ipData.ip}:${this.HTTP_PORT}/device/ping`, {
				method: "POST",
				headers: {
					"Content-type" : "application/json"
				}
			}).catch(( err ) => {
				this.setState({ isSending : false })
				Notifier.showNotification({
					title: 'エラーが発生しました',
					description: `受信クライアントの互換性がありませんでした`,
					duration: 5000,
					showAnimationDuration: 800,
				})

				return;
			})
			// catchでvoidになるので
			if( typeof askResponse === "undefined" ) return;

			if( askResponse.ok ){
				Notifier.showNotification({
					title: '送信中です。',
					description: `写真を送信しています。`,
					duration: 5000,
					showAnimationDuration: 800,
				})

				await Promise.all(
					imageBuffers.map(async (imageBuffer, index, totalArray) => {
						await this.shardSend(
							imageBuffer.buffer, 
							ipData.ip, 
							imageBuffer.mineType, 
							index + 1,
							totalArray.length,
						)
					})
				)
				.then(() => {
					Notifier.showNotification({
						title: '送信完了',
						description: `写真を送信しました。`,
						duration: 5000,
						showAnimationDuration: 800,
					})			
				})
			}
		})

		httpbridge.post("/device/ping", async (request, response) => {

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

		httpbridge.post<string>('/stream/shard', async ( request, response ) => {
			const raw = request.postData as string;
			const unZip = String(raw)
			if (typeof unZip === "undefined") {
				this.state.logs.push({
					emoji: "📨",
					message: `recived data is undefined`
				})

				return {
					"status": "NG"
				}
			}
			console.log(`unZip : ${unZip}, ${typeof unZip}`)
			this.state.logs.push({
				emoji: "📨",
				message: `Received ${unZip.length} byte`
			})
			
			const requireShardData =
				typeof unZip !== "object" ? (JSON.parse(unZip)) as { uniqueId : string, shardIndex : number } :
					unZip as { uniqueId : string, shardIndex : number }

			console.log( requireShardData.uniqueId )

			const shard = this.state.sentShards.filter(
				( v ) => v.uniqueId === requireShardData.uniqueId && v.shardIndex === requireShardData.shardIndex
			)

			if( shard.length === 0 ){
				this.state.logs.push({
					emoji: "📨",
					message: `shard not found`
				})
				return {
					"status": "NG"
				}
			}
			this.state.logs.push({
				emoji: "📨",
				message: `GET ${shard[0].shardIndex + 1} of ${shard[0].totalShards} shards from ${shard[0].from}`
			})

			return {
				"status": "OK",
				"data": shard
			}
		})

		httpbridge.post<string>("/stream", async (request, response) => {
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
				status: "Shards",
				index: postJSONData.index,
				uniqueId: postJSONData.uniqueId,
				totalImageIndex: postJSONData.totalImageIndex
			})

			console.log(`-----> Received ${postJSONData.shardIndex + 1} of ${postJSONData.totalShards} shards from ${deviceInfomationfromHash.name}(${deviceInfomationfromHash.id})`)

			const reciveShards = this.state.recivedShards.filter(
				( v ) => v.uniqueId === postJSONData.uniqueId
			)
			if (reciveShards.length === postJSONData.totalShards) {
				console.log( reciveShards[0].imgType )
				console.log(Math.round(new Date().getTime() / 1000))
				this.state.logs.push({
					emoji: "🔥",
					message: `UniqueId : ${reciveShards[0].uniqueId}`
				})
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

				const shards = this.state.recivedShards.filter((shard) => ( shard.from === postJSONData.from ) && ( shard.uniqueId === postJSONData.uniqueId ))
				const data = Buffer.concat(
					//@ts-ignore
					[...shards.sort((a, b) => a.shardIndex - b.shardIndex).map((shard) => shard.data)],
				)

				const mineType = this.getFileTypeFromBuffer(new Uint8Array(data)) ?? "application/octet-stream"
				
				console.log(`-----> Received ${data.byteLength} bytes of data from ${deviceInfomationfromHash.name}(${deviceInfomationfromHash.id})`)
				const toBase64URI = `data:${mineType};base64,${data.toString("base64")}`

				this.state.recivedShards = this.state.recivedShards.filter(
					v => v.from !== postJSONData.from
				)

				this.state.recivedDatas.push({
					from: postJSONData.from,
					bytes: data.byteLength,
					data: data,
					uri: toBase64URI,
					uniqueGroupIndex: postJSONData.from+"-"+postJSONData.index+"-"+Math.round( new Date().getTime() / 1000 )
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

	private refreshData() {
		// if( typeof this.state.isScanning !== "undefined" && this.state.isScanning ) return;

        this.setObjectState({
            services: {}
        });

        zeroconf.scan('FC9F5ED42C8A', 'tcp', 'local.')

        this.timeout && clearTimeout(this.timeout); // 現在のインターバルをリセットする
        this.timeout = setTimeout(() => {
            zeroconf.stop();
        }, 1000 * 5) // 五秒後にスキャンを停止する;
    }

	componentDidMount(): void {
		this.refreshData()
		this.__httpServer = this.httpServer() // 常時起動プロセス
		this.mDNSEventHandlers() // 常時起動プロセス
		NetworkInfo.getIPV4Address().then(v => {
			this.setState({
				ip: v
			}) // 自身の追跡用にIPを決定させておく
			this.state.logs.push({
				emoji: '📡',
				message: `My IP Address is ${v}`
			})
		})
	}

	componentWillUnmount(): void {
		if (Platform.OS === "ios") {

		}
		this.__httpServer instanceof BridgeServer && this.__httpServer.stop()
		zeroconf.stop();

	}

	render(): React.ReactNode {
		return (
			<Context.Provider
				value={{
					...this.state,
					setObjectState: this.setObjectState,
					refreshZerocnf: this.refreshData
				}}
			>
				<NotifierWrapper>
					<NavigationContainer>
						<Stack.Navigator>
							<Stack.Screen
								name="SelectImageInitScreen"
								component={SelectImageInitScreen}
							/>
							<Stack.Screen
								name="SelectSenderScreen"
								component={SelectSenderScreen}
							/>
							<Stack.Screen
								name="ScanQRScreen"
								component={QR}
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
							<Stack.Screen
								name="ScannedQRScreen"
								component={QRCodeScannedScreen}
							/>
						</Stack.Navigator>
					</NavigationContainer>
				</NotifierWrapper>
			</Context.Provider>
		)
	}
}