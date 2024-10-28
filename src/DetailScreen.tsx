/**
 * 
 * 
 * WARNING!
 * 
 * このファイルはすべて DetailScreen.newにより書き換えられました！
 * 
 * よってこのファイルは未使用です！しかし、一応のことを考えて残してはあります！！！
 * 
 * ですが！！！！これを参考にしてポスター等を書かないようご注意願います！！！！！！！！！！！！！
 * 
 * 
 * 
 */
import React, { ComponentClass } from 'react';
import { Platform, StyleSheet, Text, View, ScrollView as RNScrollView, Easing, } from 'react-native';

import { NativeStackScreenProps } from "react-native-screens/lib/typescript/native-stack/types";
import { Service } from 'react-native-zeroconf';
import DeviceInfo from 'react-native-device-info';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'react-native-image-picker';
import {
	ActivityIndicator,
	Text as PaperText,
	Button as PaperButton
} from 'react-native-paper';
import { Buffer } from 'buffer';

import { HTTPImageFrom, HTTPImageRequest, RootStackParamList } from '../types';
import { AutoHeightImage } from '../components/autosizedImage';
import { Context } from '../components/context';
import { Notifier } from 'react-native-notifier';


class App extends React.Component<NativeStackScreenProps<RootStackParamList, 'DetailScreen'>> {

	static contextType = Context;
	//@ts-ignore - エラー回避の方法が思いつかない。抽象にしても宣言にしてもすべてエラーではじかれるから萎えた。
	context!: React.ContextType<typeof Context>

	public AIRDROP_HTTP_PORT = 8771

	public state = {
		isSending: false
	}

	public static async fromDeviceCreate(): Promise<HTTPImageFrom> {
		return ({
			id: await DeviceInfo.getUniqueId(),
			name: DeviceInfo.getModel(),
			model: Platform.OS
		})
	}

	sendImage = async (service: Service) => {
		this.setState({ isSending: true })
		if (this.context.senderData === null) return;
		if (this.context.image === null) return;

		//const { senderData } = this.context;

		const imageRes = await fetch(this.context.image);
		this.context.logs.push({
			emoji: '📡',
			message: `Fetching Image : ${this.context.image}`
		})
		const imageBlob = await imageRes.arrayBuffer();
		const uri = `data:${imageRes.headers.get('content-type')?.toLocaleLowerCase()};base64,${Buffer.from(imageBlob).toString('base64')}`;
		this.context.logs.push({
			emoji: '📡',
			message: `Fetched Image : ${imageBlob.byteLength} bytes from ${this.context.image}`
		})

		const imageBuff = Buffer.from(
			imageBlob
		);

		this.context.logs.push({
			emoji: '💠',
			message: `Buffered Image : ${imageBuff.byteLength} bytes `
		})

		this.context.logs.push({
			emoji: '📡',
			message: `POST http://${service.host}:${this.AIRDROP_HTTP_PORT}/ask`
		})

		const response = await fetch(`http://${service.host}:${this.AIRDROP_HTTP_PORT}/ask`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
		}).catch((err) => {
			this.context.logs.push({
				emoji: '🚨',
				message: `Authorization not granted by ${service.fullName}(${service.addresses[0]}) successfully`
			})

			Notifier.showNotification({
				title: 'エラーが発生しました',
				description: `承認されませんでした。`,
				duration: 5000,
				showAnimationDuration: 800,
				showEasing: Easing.ease,
				hideEasing: Easing.ease,
			})
		})

		if (response === undefined) return;

		if (response.ok) {
			Notifier.showNotification({
				title: '送信中です。',
				description: `写真を送信しています。`,
				duration: 5000,
				showAnimationDuration: 800,
				showEasing: Easing.ease,
				hideEasing: Easing.ease,
			})

			this.context.logs.push({
				emoji: '✨',
				message: `Authorization granted by ${service.host}(${service.addresses[0]}) successfully`
			})

			console.log(`${Buffer.from(imageBlob).byteLength} bytes`)

			await this.shardSend(Buffer.from(imageBlob), service, uri, imageRes.headers.get('content-type')?.toLocaleLowerCase() || "image/png")

			/*
			this.context.logs.push({
				emoji: '📡',
				message: `POST http://${service.host}:${this.AIRDROP_HTTP_PORT}/upload`
			})

			const hashedFromData = Buffer.from( JSON.stringify( fromData ) ).toString("base64")

			const compressedData = Gzip.zip(JSON.stringify({
				from: hashedFromData,
				status : "Posting",
				uri : uri
			} as HTTPImageRequest))


			const response = await fetch(`http://${service.addresses[0]}:${this.AIRDROP_HTTP_PORT}/upload`, {
				method: "POST",
				headers: {
					"Content-Type": "text/plain",
				},
				body: compressedData
			})
			if( response.ok ){
				this.context.logs.push({
					emoji: '📨',
					message: `Image sent to ${service.host} successfully`
				})
			}
			*/
			this.setState({ isSending: false })
			Notifier.showNotification({
				title: '送信完了',
				description: `写真を送信しました。`,
				duration: 5000,
				showAnimationDuration: 800,
				showEasing: Easing.ease,
				hideEasing: Easing.ease,
			})
		} else {
			this.context.logs.push({
				emoji: '🚨',
				message: `This is not a valid AirDrop service: ${service.host}`
			})
		}
	}


	public promisedZip(data: object): Promise<string> {
		return new Promise((resolve) => {
			resolve( JSON.stringify(data) )
			console.log(`resolve gzip ----> Shard #${data}`)
		})
	}

	public async shardSend(data: Buffer, service: Service, uri: string, typeofImage: string) {

		const SHARD_BYTES = 32768 // 32KB
		const shards = this.shardingManager(data, SHARD_BYTES)

		console.log(`Shard #0 : ${shards[0].byteLength} bytes`)

		this.context.logs.push({
			emoji: '💎',
			message: `Sharded ${shards.length} shards, each shard is ${SHARD_BYTES} bytes?`
		})

		const fromData = await App.fromDeviceCreate()

		const hashedFromData = Buffer.from(JSON.stringify(fromData)).toString("base64")

		console.log(Math.round(new Date().getTime() / 1000))

		const compressedDatas = await Promise.all(
			shards.map(async (shard, index) => {
				console.log(`Pending gzip ----> Shard #${index}`)
				const compressedData = await this.promisedZip({
					from: hashedFromData,
					status: "SHARD_POSTING",
					uri: shard.toString("binary"),
					totalShards: shards.length,
					shardIndex: index,
					imgType: typeofImage,
				} as HTTPImageRequest)
				console.log(`Gziped <---- Shard #${index}`)

				return compressedData
			})
		)

		await Promise.all(
			compressedDatas.map(async (compressedData, index) => {
				console.log(`Pending <---- Shard #${index}`)
				const response = await fetch(`http://${service.addresses[0]}:${this.AIRDROP_HTTP_PORT}/upload/shard`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: compressedData
				})

				if (!response.ok) {
					Notifier.showNotification({
						title: 'エラーが発生しました',
						description: `シャード(#${index})の送信に失敗しました。`,
						duration: 5000,
						showAnimationDuration: 800,
						showEasing: Easing.ease,
						hideEasing: Easing.ease,
					});

					this.setState({ isSending: false })
					Notifier.showNotification({
						title: 'エラーが発生しました。',
						description: `シャード(#${index})の送信に失敗しました。`,
						duration: 5000,
						showAnimationDuration: 800,
						showEasing: Easing.ease,
						hideEasing: Easing.ease,
					})
				}
			})
		)

	}


	public shardingManager(base64Data: Buffer, shardBytes = 8192): Buffer[] {
		const data = base64Data
		const totalShards = Math.ceil(data.byteLength / shardBytes)
		const shards = []
		for (let i = 0; i < totalShards; i++) {
			const shard = data.subarray(i * shardBytes, (i + 1) * shardBytes)
			shards.push(shard)
		}
		console.log(`Sharded ${shards.length} shards, each shard is ${shardBytes} bytes`)
		return shards
	}

	imagePicker = () => {
		const option: ImagePicker.ImageLibraryOptions = {
			mediaType: 'photo',
			quality: 1,
			includeBase64: true
		}

		ImagePicker.launchImageLibrary(option, (resposeImage) => {
			if (resposeImage.didCancel) {
				this.context.logs.push({
					emoji: '[!]',
					message: `User cancelled the image picker`
				})
			}
			else if (resposeImage.errorMessage || resposeImage.errorCode) {
				this.context.logs.push({
					emoji: '[!]',
					message: `Image picker error: ${resposeImage.errorCode || resposeImage.errorMessage}`
				})
			}
			else {
				if (resposeImage.assets === null || resposeImage.assets?.length === 0) return;
				if (!Array.isArray(resposeImage.assets)) return;
				if (typeof resposeImage.assets[0].base64 === "undefined") return;
				this.context.logs.push({
					emoji: '📸',
					message: `Image selected: ${JSON.stringify(resposeImage.assets[0].originalPath)}`
				})
				this.context.setObjectState({ image: resposeImage.assets[0].uri })
			}
		})
	}

	render() {

		const { services, selectedService } = this.context
		const service = selectedService ? services[selectedService] : null;;

		if (service === null) {
			return (
				<SafeAreaProvider>
					<SafeAreaView style={styles.container}>
						<PaperText>
							サービスが選択されていません
						</PaperText>
					</SafeAreaView>
				</SafeAreaProvider>
			)
		}

		return (
			<SafeAreaProvider>
				<SafeAreaView style={styles.container}>
					<RNScrollView>
						<View style={styles.udpadding}>
							<PaperText variant="headlineMedium" >
								{typeof service.clientName === "undefined" ? service.fullName.split('.')[0] : service.clientName} ({service.addresses.join(', ')})
							</PaperText>
							<PaperText>
								このデバイスは{service.clientModel}です。
							</PaperText>
						</View>
						<PaperButton mode="contained-tonal" onPress={this.imagePicker}>
							画像を選択する
						</PaperButton>
						<View style={styles.udpadding}>
							{this.context.image && <AutoHeightImage source={{ uri: this.context.image }} width={350} />}
						</View>
						{this.context.image && <PaperButton mode="contained-tonal" onPress={() => this.sendImage(service)} disabled={this.state.isSending}>{this.state.isSending ? "送信中" : "送信する"}</PaperButton>}
					</RNScrollView>
				</SafeAreaView>
			</SafeAreaProvider>
		);
	}
}

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

export default App;