
import 'react-native-gesture-handler'
import { Component, ContextType } from "react"
import { 
    Platform,
    StyleSheet,
    View,
    ScrollView as RNScrollView,
    Easing,
    GestureResponderEvent
} from 'react-native'
import {
    Button,
    Text as PaperText 
} from "react-native-paper"
import { Service } from "react-native-zeroconf"
import { NativeStackScreenProps } from 'react-native-screens/lib/typescript/native-stack/types'
import { HTTPImageFrom, HTTPImageRequest, RootStackParamList } from '../types'
import { Context } from '../components/context'
import DeviceInfo from 'react-native-device-info'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { ImageLibraryOptions, launchImageLibrary } from 'react-native-image-picker'
import { Notifier } from 'react-native-notifier'
import { AutoHeightImage } from '../components/autosizedImage'
import { Buffer } from 'buffer';

const {
    showNotification
} = Notifier

export default class DetailScreen extends Component<
    NativeStackScreenProps< RootStackParamList, 'DetailScreen' >
> {
    /**
     * Context
     */
    static contextType : typeof Context = Context
	//@ts-ignore - エラー回避の方法が思いつかない。抽象にしても宣言にしてもすべてエラーではじかれるから萎えた。
    context !: ContextType< typeof Context >
    
    public readonly HTTP_PORT : number = 8771
    public readonly BYTES : number = 32768 * 2 // 64KB
    public state = {
        isSending : false,
        startTime : 0
    }

    public static async fromDeviceCreate() : Promise< HTTPImageFrom > {
        return ({
			id: await DeviceInfo.getUniqueId(),
			name: DeviceInfo.getModel(),
			model: Platform.OS
		})
    }

    public selectImage( e : GestureResponderEvent ){
        const option : ImageLibraryOptions = {
            mediaType : "photo",
            quality : 1,
            includeBase64: true
        }

        launchImageLibrary( option, ( responseImage ) => {
            if( responseImage.didCancel ){
                return;
            }
            else if(
                responseImage.errorMessage ||
                responseImage.errorCode
            ) {
                return;
            }
            else {
                if(
                    responseImage.assets === null ||
                    responseImage.assets?.length === 0 ||
                    !Array.isArray( responseImage.assets ) 
                    //typeof responseImage.assets[0].base64 === "undefined"
                ) return;
                //console.log( responseImage.assets[0] );

                this.context.setObjectState({
                    image: responseImage.assets[0].uri
                })
            }
        })
    }

    public async sendImage( service : Service ){
        if(
            this.context.selectedService === null ||
            this.context.image === null
        ) return;
        this.setState({ isSending : true })
        this.setState({
            startTime : Date.now()
        })

        const imageResponse = await fetch( this.context.image )
        const imageBlob = await imageResponse.arrayBuffer();
        /**
         * バッファー
         */
        const imageBuffer = Buffer.from( imageBlob )
        const askResponse = await fetch(`http://${service.host}:${this.HTTP_PORT}/ask`, {
            method: "POST",
            headers: {
                "Content-type" : "application/json"
            }
        }).catch(( err ) => {
            this.setState({ isSending : false })
            showNotification({
				title: 'エラーが発生しました',
				description: `承認されませんでした。`,
				duration: 5000,
				showAnimationDuration: 800,
				showEasing: Easing.ease,
				hideEasing: Easing.ease,
			})

            return;
        })
        // catchでvoidになるので
        if( typeof askResponse === "undefined" ) return;

        if( askResponse.ok ){
            showNotification({
				title: '送信中です。',
				description: `写真を送信しています。`,
				duration: 5000,
				showAnimationDuration: 800,
				showEasing: Easing.ease,
				hideEasing: Easing.ease,
			})

            // シャード送信をする
            await this.shardSend( 
                imageBuffer, 
                service,
                imageResponse.headers.get('content-type')?.toLocaleLowerCase() || "image/png" 
            )
        }
    }

    public async shardSend( rawData : Buffer, service : Service, contentType : string ) {
        const shards = this.shardProsessor( rawData, this.BYTES );
        const fromData = await DetailScreen.fromDeviceCreate();
        const hashedFromData = Buffer.from(
            JSON.stringify( fromData )
        ).toString("base64")

        const toStringedDatas = await Promise.all(
            shards.map( async ( shard, index ) => {
                const requestObject = {
                    from : hashedFromData,
                    status : "SHARD_POSTING",
                    uri : shard.toString("binary"),
                    totalShards : shards.length,
                    shardIndex : index,
                    imgType : contentType
                }
                const stringifyData = JSON.stringify( requestObject )
                return stringifyData
            })
        )

        await Promise.all(
            toStringedDatas.map( async ( datum, index ) => {
                const response = await fetch(`http://${service.addresses[0]}:${this.HTTP_PORT}/upload/shard`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: datum
				})

                if (!response.ok) {
					this.setState({ isSending: false })
					showNotification({
						title: 'エラーが発生しました。',
						description: `シャード(#${index})の送信に失敗しました。`,
						duration: 5000,
						showAnimationDuration: 800,
						showEasing: Easing.ease,
						hideEasing: Easing.ease,
					})
				}

                if( toStringedDatas.length === index + 1 ) {
                    console.log(`Send completed ${Date.now() - this.state.startTime} ms`)
                    showNotification({
                        title : `送信が完了しました。 かかった時間：${Date.now() - this.state.startTime} ms`,
                        description : `シャード個数 ${toStringedDatas.length } shards, トータル ${Math.round( ( rawData.byteLength / 1024 / 1024 )* 10 ) / 10 } MB`
                    })
                    this.context.setObjectState({
                        image : null
                    })
                    this.props.navigation.navigate('デバイスの選択')
                }
            })
        )
    }

    public shardProsessor( data : Buffer, size : number = 32768){
		const totalShards = Math.ceil(data.byteLength / size)
		const shards : Buffer[] = []
		for (let i = 0; i < totalShards; i++) {
			const shard = data.subarray(i * size, (i + 1) * size)
			shards.push(shard)
		}
		console.log(`Sharded ${shards.length} shards, each shard is ${size} bytes`)
		return shards
    }

    render() {

        const { services, selectedService } = this.context;
        const service = selectedService ? services[selectedService] : null;

        if( service === null ){
            return (
                <SafeAreaProvider>
                    <SafeAreaView>
                        <PaperText> このメッセージは実はおかしい。</PaperText>
                        <PaperText> サービスが選択されていません </PaperText>
                    </SafeAreaView>
                </SafeAreaProvider>
            )
        }

        return (
            <SafeAreaProvider>
                <SafeAreaView style={ styles.container }>
                    <RNScrollView>
                        <View style={ styles.udpadding}>
                            <PaperText variant="headlineMedium">
                                {typeof service?.clientName === "undefined" ? service.fullName.split('.')[0] : service.clientName} ({service.addresses.join(', ')})
                            </PaperText>
                        </View>
                        <Button mode="contained-tonal" onPress={(e) => this.selectImage(e)}>
                            画像を選択する
                        </Button>
                        <View style={styles.flexCenter}>
                            {this.context.image &&  <AutoHeightImage source={{ uri: this.context.image }} width={350} />}
                        </View>
                        <Button mode="contained-tonal" onPress={() => this.sendImage( service )} disabled={this.state.isSending || !this.context.image} >
                            データを送信する
                        </Button>
                    </RNScrollView>
                </SafeAreaView>
            </SafeAreaProvider>
        )
    }
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		marginLeft: 10,
		marginRight: 10,
		marginBottom: 10,
	},
    flexCenter : {
        flex : 1,
        justifyContent : "center",
        alignItems : "center",
        marginTop : 10,
        marginBottom : 10,
    },
    udpadding: {
		paddingTop: 10,
		paddingBottom: 10
	},
})