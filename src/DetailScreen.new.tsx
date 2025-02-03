
import 'react-native-gesture-handler'
import { ContextType } from "react"
import { 
    Platform,
    StyleSheet,
    View,
    ScrollView as RNScrollView,
    GestureResponderEvent
} from 'react-native'
import {
    Button,
    Text as PaperText 
} from "react-native-paper"
import { HTTPImageFrom } from '../types'
import { Context } from '../components/context'
import DeviceInfo from 'react-native-device-info'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { ImageLibraryOptions, launchImageLibrary } from 'react-native-image-picker'
import { AutoHeightImage } from '../components/autosizedImage'
import { NetworkInfo } from 'react-native-network-info'
import { ShardSender } from '../components/shardSender'


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
        ip : ""
    }

    componentDidMount(): void {
        NetworkInfo.getIPV4Address().then(v => {
			this.setState({
				ip: v
			}) // 自身の追跡用にIPを決定させておく
		})
    }

    callback() {
        this.context.setObjectState({
            image: null
        })
        this.props.navigation.navigate('SelectImageInitScreen')
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
                        <View style={styles.flexCenter}>
                            {this.context.image &&  <AutoHeightImage source={{ uri: this.context.image }} width={350} />}
                        </View>
                        <Button mode="contained-tonal" onPress={() => this.sendImage( service, this.context.image, this.context.selectedService, () => this.callback() )} disabled={this.state.isSending || !this.context.image} >
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

DetailScreen.contextType = Context