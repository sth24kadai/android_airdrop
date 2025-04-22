
import 'react-native-gesture-handler'
import { ContextType } from "react"
import { 
    StyleSheet,
    View,
    ScrollView as RNScrollView,
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
                        <Button style={styles.upMargin} mode="contained" onPress={() => this.sendImage( service, this.context.image, this.context.selectedService, () => this.callback() )} disabled={this.state.isSending || !this.context.image} >
                            データを送信する
                        </Button>
                        <View style={styles.flexCenter}>
                            {this.context.image && [...( Array.isArray( this.context.image ) ? this.context.image : [this.context.image])].map((uri, index) => (<AutoHeightImage style={styles.imageStyle} key={index} source={{ uri: uri }} width={350} hiddenDeleteBtn={true}/> ))}
                        </View>
                    </RNScrollView>
                </SafeAreaView>
            </SafeAreaProvider>
        )
    }
}

const styles = StyleSheet.create({
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