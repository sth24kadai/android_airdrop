import React, { ComponentClass } from 'react';
import { Platform, StyleSheet, Text, View, ScrollView as RNScrollView,} from 'react-native';

import { NativeStackScreenProps } from "react-native-screens/lib/typescript/native-stack/types";
import { Service } from 'react-native-zeroconf';
import { Context } from '../components/context';
import { HTTPImageFrom, HTTPImageRequest } from '../types';
import DeviceInfo from 'react-native-device-info';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'react-native-image-picker';
import { 
	ActivityIndicator, 
	Text as PaperText, 
	Button as PaperButton 
} from 'react-native-paper';
import { AutoHeightImage } from '../components/autosizedImage';
import { Buffer } from 'buffer';

type RootStackParamList = {
    デバイスの選択: ComponentClass;
    DetailScreen: undefined;
    LogScreen: undefined;
};

class App extends React.Component<NativeStackScreenProps<RootStackParamList, 'DetailScreen'>> {

    static contextType = Context;
    //@ts-ignore
    context!: React.ContextType<typeof Context>

    public AIRDROP_HTTP_PORT = 8771

    public static async fromDeviceCreate() : Promise<HTTPImageFrom> {
		return ({
			id : await DeviceInfo.getUniqueId(),
			name : DeviceInfo.getModel(),
			model : Platform.OS
		})
	}

    sendImage = async (service: Service) => {
		if (this.context.senderData === null) return;
		if (this.context.image === null) return;

		//const { senderData } = this.context;

		const imageRes = await fetch(this.context.image);
		this.context.logs.push({
			emoji: '📡',
			message: `Fetching Image : ${this.context.image}`
		})
		const imageBlob = await imageRes.arrayBuffer();
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
			message: `POST http://${service.host}:${this.AIRDROP_HTTP_PORT}/Ask`
		})

		const response = await fetch(`http://${service.host}:${this.AIRDROP_HTTP_PORT}/Ask`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"image": this.context.image,
				"senderData": this.context.senderData
			})
		}).catch((err) => {
			this.context.logs.push({
				emoji: '🚨',
				message: `Authorization not granted by ${service.fullName}(${service.addresses[0]}) successfully`
			})
		})

		if (response === undefined) return;

		const fromData = await App.fromDeviceCreate()

		if (response.ok) {
			this.context.logs.push({
				emoji: '✨',
				message: `Authorization granted by ${service.host}(${service.addresses[0]}) successfully`
			})

			this.context.logs.push({
				emoji: '📡',
				message: `POST http://${service.host}:${this.AIRDROP_HTTP_PORT}/upload`
			})

			const hashedFromData = Buffer.from( JSON.stringify( fromData ) ).toString("base64")

			const response = await fetch(`http://${service.host}:${this.AIRDROP_HTTP_PORT}/upload`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					from: hashedFromData,
					status : "Posting",
					image: imageBuff.toString()
				} as HTTPImageRequest)
			})
			if( response.ok ){
				this.context.logs.push({
					emoji: '📨',
					message: `Image sent to ${service.host} successfully`
				})
			}
		} else {
			this.context.logs.push({
				emoji: '🚨',
				message: `This is not a valid AirDrop service: ${service.host}`
			})
		}
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

        if( service === null ) {
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
                                {service.clientName} ({service.addresses.join(', ')})
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
                        {this.context.image && <PaperButton mode="contained-tonal" onPress={() => this.sendImage(service)}>送信する</PaperButton>}
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