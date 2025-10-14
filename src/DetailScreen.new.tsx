
import 'react-native-gesture-handler'
import { ContextType } from "react"
import { 
    StyleSheet,
    View,
    ScrollView as RNScrollView,
    Text,
} from 'react-native'
import {
    Button,
    Text as PaperText 
} from "react-native-paper"
import { Context } from '../components/context'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { AutoHeightImage } from '../components/autosizedImage'
import { NetworkInfo } from 'react-native-network-info'
import { ShardSender } from '../components/shardSender'
import { HTTPBufferRequest } from '../types'
import { Service } from 'react-native-zeroconf'
import { Icon } from 'react-native-elements'


export default class DetailScreen extends ShardSender<'DetailScreen'> {
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
        startTime : 0,
        ip : "",
        estimate : 0
    }

    public timer : NodeJS.Timeout | null = null

    componentDidMount(): void {
        NetworkInfo.getIPV4Address().then(v => {
			this.setState({
				ip: v
			}) // 自身の追跡用にIPを決定させておく
		})

        this.timer = setInterval( () => {
            if( this.state.isSending ){
                if( this.estimate !== this.state.estimate ){
                    this.setState({
                        estimate: this.estimate
                    })
                }
            }
        }, 500 )
    }

    componentWillUnmount(): void {
        if( this.timer ){
            clearInterval( this.timer )
            this.timer = null
        }
    }

    callback( sentShards : HTTPBufferRequest[] ) {
        this.context.setObjectState({
            image: null,
            sentShards: [ ...this.context.sentShards, ...sentShards],
        })
        this.props.navigation.navigate('SelectImageInitScreen')
    }

    onButtonPress( service: Service & { clientName : string, clientModel : string } ) {

        if( service === null ){
            this.context.logs.push({ emoji: "🤬", message: "サービスが選択されていません。" })
            return;
        }

        this.setState({
            isSending: true
        })

        this.sendImage(
            service,
            this.context.image,
            this.context.selectedService,
            ( sentShards ) => this.callback( sentShards )
        )
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
                        <Button 
                            style={styles.upMargin} 
                            mode="contained" 
                            onPress={() => this.onButtonPress( service )} 
                            disabled={this.state.isSending || !this.context.image} 
                        >
                            データを送信する
                        </Button>
                        <View style={styles.flexCenter}>
                            {
                                this.context.image && [
                                    ...( Array.isArray( this.context.image ) ? this.context.image : [this.context.image])
                                ].map(
                                    (uri, index) => (
                                        uri.isFile ? (
                                                    <Text key={index} style={styles.filePreview}>
                                                        <Icon name="description" size={35} /> 
                                                        {uri.name}
                                                    </Text>
                                                ) : 
                                        <AutoHeightImage 
                                            style={styles.imageStyle} 
                                            key={index} 
                                            source={{ uri: uri.uri }} 
                                            width={350} 
                                            hiddenDeleteBtn={true}
                                        /> 
                                    )
                                )
                            }
                        </View>
                        {
                            this.state.isSending && (
                                <View style={styles.statusComponent}>
                                    <PaperText>送信中...</PaperText>
                                    <PaperText>推定残り時間: { Math.round( this.state.estimate / 1000 ) }秒</PaperText>
                                </View>
                            )
                        }
                    </RNScrollView>
                </SafeAreaView>
            </SafeAreaProvider>
        )
    }
}

const styles = StyleSheet.create({
    filePreview: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        borderRadius: 10,
        gap: 10,
        backgroundColor: '#f9f9f9'
    },
    statusComponent : {
        flexDirection : "row",
        justifyContent : "space-between",
        alignItems : "center",
        marginTop : 10,
        marginBottom : 10,
        borderRadius : 13,
        borderStyle : "solid",
        borderWidth : 2,
        borderColor : "#e3e3e3",
        padding : 10,
    },
    upMargin: {
        marginTop: 10,
    },
    imageStyle: {
        borderRadius: 13,
        borderStyle: "solid",
        borderWidth: 2,
        borderColor: "#e3e3e3",
    },
    container: {
		flex: 1,
		marginLeft: 10,
		marginRight: 10,
		marginBottom: 10,
        marginTop: 10,
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#f0f0f0",
        minHeight: 100,
        minWidth: "100%"
	},
    flexCenter : {
        flex : 1,
        flexDirection : "column",
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

DetailScreen.contextType = Context