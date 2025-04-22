
import 'react-native-gesture-handler'
import { Component, ContextType } from "react"
import { 
    Platform,
    StyleSheet,
    View,
    ScrollView as RNScrollView,
} from 'react-native'
import {
    Text as PaperText,
    Button as PaperButton
} from "react-native-paper"
import { NativeStackScreenProps } from 'react-native-screens/lib/typescript/native-stack/types'
import {  RootStackParamList } from '../types'
import { Context } from '../components/context'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { Notifier } from 'react-native-notifier'

export default class QRCodeScannedScreen extends Component<
    NativeStackScreenProps< RootStackParamList, 'ScannedQRScreen' >
> {
    /**
     * Context
     */
    static contextType : typeof Context = Context
	//@ts-ignore - エラー回避の方法が思いつかない。抽象にしても宣言にしてもすべてエラーではじかれるから萎えた。
    context !: ContextType< typeof Context >
    
    public readonly HTTP_PORT : number = 8771

    state = {
        clientId: null,
        clientName: null,
        clientModel: null,
        isLoadSuccess : false
    }

    componentDidMount(): void {
        this.getUserInfomation()
    }


    async getUserInfomation(){
        if( typeof this.context.selectedService == "undefined" ) return;
        console.log( this.context.selectedService, "fetching" )
        const user = await fetch(`http://${this.context.selectedService}:${this.HTTP_PORT}/info`)
        .catch( err => {
            this.context.logs.push({ emoji: "🤬", message: "Failed to fetch. Fetch promise was not establish."})
            this.context.logs.push({ emoji: "🤬", message: "Stack trase"})
            this.context.logs.push({ emoji: "🤬", message: err})

            console.log(`fetch error : ${err}`)
            Notifier.showNotification({
                title: "エラー",
                description: "ユーザ情報の取得に失敗しました。もう一度やり直してください。",
                duration: 5000,
            })
            this.props.navigation.goBack()
            return;
        })
        if( !( user instanceof Response ) ) return;
        console.log( user.status )
        if( user.status !== 200 ) {
            this.context.logs.push({ emoji: "🤬", message: "Failed to fetch. HTTP response wasn't returned 200."})
            this.context.logs.push({ emoji: "🤬", message: "HTTP STATUS trase"})
            this.context.logs.push({ emoji: "🤬", message: user.status.toString()})

            Notifier.showNotification({
                title: "エラー",
                description: "ユーザ情報の取得に失敗しました。もう一度やり直してください。",
                duration: 5000,
            })
            this.props.navigation.goBack()
            return;
        }

        const json = await user.json() as { status: string, data: { clientId: object, clientName: string, clientModel: string } };

        this.setState({
            clientId: json.data.clientId,
            clientName: json.data.clientName,
            clientModel: json.data.clientModel,
            isLoadSuccess: true
        })
    }

    async checkSenderClient() {
        console.log( this.context.selectedService )
        const response = await fetch(`http://${this.context.selectedService}:${this.HTTP_PORT}/qr/please`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ip: this.context.ip
            })
        }).catch( err => {
            this.context.logs.push({ emoji: "🤬", message: "Failed to fetch. Fetch promise was not establish."})
            this.context.logs.push({ emoji: "🤬", message: "Stack trase"})
            this.context.logs.push({ emoji: "🤬", message: err})

            console.log(`fetch error : ${err}`)
            Notifier.showNotification({
                title: "エラー",
                description: "送信者の許可に失敗しました。もう一度やり直してください。",
                duration: 5000,
            })
            this.props.navigation.goBack()
            return;
        })

        console.log( response )

        if( !( response instanceof Response ) ) return;

        const json = await response.json() as { status: string }
        console.log( json )
        if( json.status == "NG") {
            Notifier.showNotification({
                title: "エラー",
                description: "送信者の許可に失敗しました。もう一度やり直してください。",
                duration: 5000,
            })
            this.props.navigation.goBack()
            return;
        }

        if( response.status !== 200 ) {
            this.context.logs.push({ emoji: "🤬", message: "Failed to fetch. HTTP response wasn't returned 200."})
            this.context.logs.push({ emoji: "🤬", message: "HTTP STATUS trase"})
            this.context.logs.push({ emoji: "🤬", message: response.status.toString()})

            Notifier.showNotification({
                title: "エラー",
                description: "送信者の許可に失敗しました。もう一度やり直してください。",
                duration: 5000,
            })
            this.props.navigation.goBack()
            return;
        }

        this.context.setObjectState({
            selectedService: null
        })
        this.props.navigation.navigate("写真の保存")
    }


    render() {
        if( this.state.isLoadSuccess ) {
            return (
                <SafeAreaView style={styles.container}>
                    <RNScrollView>
                        <View style={styles.flexCenter}>
                            <PaperText style={{fontSize: 20}}> このデバイスの画像を受信しますか？</PaperText>
                            <PaperText>{this.state.clientName}</PaperText>
                            <PaperText>{this.state.clientModel}</PaperText>
                            <PaperButton icon="archive" mode='contained-tonal' onPress={() => this.checkSenderClient()}>共有を許可する</PaperButton>
                            <PaperButton icon="archive" mode='contained-tonal' onPress={() => this.props.navigation.navigate("写真の保存")}>保存画面に飛ぶ（仮）</PaperButton>
                        </View>
                    </RNScrollView>
                </SafeAreaView>
            )
        }
        return (
            <SafeAreaView style={styles.container}>
                <RNScrollView>
                    <View style={styles.flexCenter}>
                        <PaperText>読み込み中 : {this.state.isLoadSuccess}</PaperText>
                    </View>
                </RNScrollView>
            </SafeAreaView>
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
        gap: 5
    },
    udpadding: {
		paddingTop: 10,
		paddingBottom: 10
	},
})

QRCodeScannedScreen.contextType = Context