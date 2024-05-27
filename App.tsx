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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SafeAreaView from 'react-native-safe-area-view';

import { Button, Image, ListItem } from 'react-native-elements'
import Zeroconf, { Service } from 'react-native-zeroconf'
import { AnimatedText } from './components/animated_text';
import { ScrollView } from 'react-native-gesture-handler';
import { BridgeServer } from 'react-native-http-bridge-refurbished';
import { Ask } from './types/airdrop.ask';
import { Discover } from './types/airdrop.discover';
import { Buffer } from 'buffer';

import * as ImagePicker from 'react-native-image-picker';
//@ts-ignore

const zeroconf = new Zeroconf()

interface State {
	isScanning: boolean
	selectedService: string | null
	services: { [key: string]: Service }
	logs: {
		emoji: string,
		message: string
	}[],
	showLogs: boolean,
	image : string | null,
	senderData : Ask | null
}

export default class App extends Component {
	public state: State = {
		isScanning: false,
		selectedService: null,
		services: {} as { [key: string]: Service },
		logs: [],
		showLogs: false,
		image : null,
		senderData : {} as Ask
	}
	public timeout: NodeJS.Timeout | undefined = void 0

	public AIRDROP_HTTP_PORT = 8771

	private __BridgeServer: BridgeServer | null = null

	public httpServer() { 
		const httpbridge = new BridgeServer("nubejson.local", true)
		httpbridge.listen( this.AIRDROP_HTTP_PORT );

		this.state.logs.push({
			emoji: '🔗',
			message: `Starting HTTP server on port ${this.AIRDROP_HTTP_PORT}`
		})

		httpbridge.post("/Discover", async (request, response) => {
			return {
				"ReceiverMediaCapabilities" : Buffer.from(JSON.stringify({
					version : 1
				})),
				"ReciverComputerName" : "Google Pixel 6a",
				"ReceiverModelName" : "Pixel 6a",
			} as Discover
		})

		httpbridge.post<Ask>("/Ask", async (request, response) => {

			const data = request.data
			this.state.senderData = data as Ask

			return {
				"ReceiverComputerName" : "Google Pixel 6a",
				"ReceiverModelName" : "Pixel 6a"
			} as Ask
		})

		return httpbridge;
	}

	componentDidMount() {
		this.__BridgeServer = this.httpServer();
		this.refreshData()
		zeroconf.publishService(
			'airdrop', 
			'tcp', 
			'local.', 
			"AirDrop Service",
			5353
		)

		zeroconf.on('start', () => {
			this.setState({ isScanning: true })
			this.state.logs.push({
				emoji: '🔍',
				message: 'Started scanning and lunching the mDNS service...'
			})

		})

		zeroconf.on('stop', () => {
			this.setState({ isScanning: false })
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

		zeroconf.on('resolved', service => {
			this.state.logs.push({
				emoji: '🐉',
				message: `Resolved ${service.name} (${service.host})`
			})
			this.state.logs.push({
				emoji: '🔗',
				message: JSON.stringify(service)
			})

			this.resolveService( service );

			this.setState({
				services: {
					...this.state.services,
					[service.host]: service,
				},
			})
		})

		zeroconf.on('error', err => {
			this.setState({ isScanning: false })
			this.state.logs.push({
				emoji: '🚨',
				message: `Error: ${err}`
			})
		})
	}

	componentWillUnmount() {

		this.state.logs.push({
			emoji: '🛑',
			message: 'Unmounting the component and stopping the mDNS service...'
		})

		this.__BridgeServer !== null && this.__BridgeServer.stop()
		zeroconf.stop();
	}

	renderRow = ({ item, index }: { item: string, index: number }) => {
		const { name, fullName, host, addresses } = this.state.services[item]

		return (
			<TouchableOpacity
				onPress={() =>
					this.setState({
						selectedService: host,
					})}
			>
				<ListItem.Content>
					<ListItem.Title>{name}</ListItem.Title>
					<ListItem.Subtitle>{fullName} / {addresses.join(',')}</ListItem.Subtitle>
				</ListItem.Content>
			</TouchableOpacity>
		)
	}

	refreshData = () => {
		const { isScanning } = this.state
		if (isScanning) {
			return
		}
		this.setState({ services: [] })

		zeroconf.scan('airdrop', 'tcp', 'local.')
		this.state.logs.push({
			emoji: '🔍♻️',
			message: 'ReScanning for services...'
		})

		clearTimeout(this.timeout)
		this.timeout = setTimeout(() => {
			zeroconf.stop()
		}, 5000)
	} 

	showlogs = () => {
		this.setState({ selectedService: null })
		this.setState({ showLogs: true })
	}

	imagePicker = () => {
		const option : ImagePicker.ImageLibraryOptions = {
			mediaType: 'photo',
			quality: 1,
			includeBase64: true
		}

		ImagePicker.launchImageLibrary( option , ( resposeImage ) => {
			if( resposeImage.didCancel ) {
				this.state.logs.push({
					emoji: '[!]',
					message: `User cancelled the image picker`
				})
			}
			else if( resposeImage.errorMessage || resposeImage.errorCode ) {
				this.state.logs.push({
					emoji: '[!]',
					message: `Image picker error: ${resposeImage.errorCode || resposeImage.errorMessage}`
				})
			}
			else {
				if( resposeImage.assets === null || resposeImage.assets?.length === 0 ) return;
				if( !Array.isArray( resposeImage.assets )) return;
				if( typeof resposeImage.assets[0].base64 === "undefined" ) return;
				this.state.logs.push({
					emoji: '📸',
					message: `Image selected: ${JSON.stringify(resposeImage.assets[0].originalPath)}`
				})
				this.setState({ image: resposeImage.assets[0].uri })
			}
		})
	}

	sendImage = async ( service : Service ) => {
		if( this.state.senderData === null ) return;
		if( this.state.image === null ) return;

		//const { senderData } = this.state;

		const imageRes  = await fetch(this.state.image);
		const imageBlob = await imageRes.blob();
		const imageBuff = Buffer.from(
			await imageBlob.arrayBuffer()
		);


		const response = await fetch(`http://${service.host}:${this.AIRDROP_HTTP_PORT}/Ask`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-cpio",
				"Transfer-Encoding": "chunked",
				"Content-Length": "0",
				"Connection": "close"
			},
			body: imageBuff.toString()
		})

		if( response.ok ) {
			await fetch(`http://${service.host}:${this.AIRDROP_HTTP_PORT}/Upload`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					"image" : this.state.image,
					"senderData" : this.state.senderData
				})
			
			})
		} else {
			this.state.logs.push({
				emoji: '🚨',
				message: `This is not a valid AirDrop service: ${service.host}`
			})
		}
	}

	async resolveService( service: Service ) {
		const respose = await fetch(`http://${service.host}:${this.AIRDROP_HTTP_PORT}/Discover`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				}
			})
			
		if( respose.ok ) {
			const data = await respose.json()
			this.state.logs.push({
				emoji: '🔗',
				message: JSON.stringify(data)
			})
		} else {
			this.state.logs.push({
				emoji: '🚨',
				message: `This is not a valid AirDrop service: ${service.host}`
			})
		
		}
	}

	render() {
		const { services, selectedService, isScanning } = this.state
		console.log(selectedService)

		const service = selectedService ? services[selectedService] : null;

		if (service) {
			return (
				<SafeAreaProvider>
					<SafeAreaView style={styles.container}>
						<TouchableOpacity onPress={() => this.setState({ selectedService: null })}>
							<Text style={styles.closeButton}>{'詳細を閉じる'}</Text>
						</TouchableOpacity>
						<Text style={styles.state}>{service.host}</Text>
						<Text style={styles.state}>{service.addresses.join('\n')}</Text>
						<View style={styles.json}>
							<Text>{JSON.stringify(service, null, 2)}</Text>
						</View>
						<Button title="画像を選択する" onPress={this.imagePicker} />
						{ this.state.image && <Image source={{ uri: this.state.image }} style={{ width: 200, height: 200 }} /> }
						{ this.state.image && <Button title="送信する" onPress={() => this.sendImage( service )} /> }
					</SafeAreaView>
				</SafeAreaProvider>
			)
		}

		if (this.state.showLogs) {
			return (
				<SafeAreaProvider>
					<SafeAreaView style={styles.container}>
						<TouchableOpacity onPress={() => this.setState({ showLogs: false })}>
							<Text style={styles.closeButton}>{'ログを閉じる'}</Text>
						</TouchableOpacity>
						<RNScrollView style={styles.logs} >
							{this.state.logs.map((log, index) => (
								<View style={ styles.flexLog }>
									<Text key={index} style={styles.logs}>{log.emoji}</Text>
									<Text key={"k"+index} style={styles.json}>{log.message}</Text>
								</View>
							))}
						</RNScrollView>
					</SafeAreaView>
				</SafeAreaProvider>
			)
		}

		return (
			<SafeAreaProvider>
				<SafeAreaView style={styles.container}>
					<Text style={styles.state}><AnimatedText text={isScanning ? "🔍" : "🚀"} />{isScanning ? ' お友達を探しています...' : ' 共有するデバイスの選択'}</Text>
					{
						isScanning ? (
							<>
								<Text style={styles.state}>付近のデバイスを検索中</Text>
							</>
						) : (
							<>
								<FlatList
									data={Object.keys(services)}
									renderItem={this.renderRow}
									keyExtractor={key => key}
									refreshControl={
										<RefreshControl
											refreshing={isScanning}
											onRefresh={this.refreshData}
											tintColor="skyblue"
										/>
									}
								/>
								<Button title="デバックログを確認する" onPress={this.showlogs} />
							</>
						)
					}
				</SafeAreaView>
			</SafeAreaProvider>
		)
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		marginLeft: 10
	},
	closeButton: {
		padding: 20,
		textAlign: 'center',
	},
	json: {
		padding: 6,
		fontWeight : "bold",
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
	flexLog : {
		display: 'flex',
		flexDirection: "row",
		alignContent : "center"
	}
})