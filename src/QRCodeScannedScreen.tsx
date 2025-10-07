
import 'react-native-gesture-handler'
import { Component, ContextType } from "react"
import {
    StyleSheet,
    View,
    ScrollView as RNScrollView,
} from 'react-native'
import {
    Text as PaperText,
    Button as PaperButton,
} from "react-native-paper"
import { NativeStackScreenProps } from 'react-native-screens/lib/typescript/native-stack/types'
import { RootStackParamList } from '../types'
import { Context } from '../components/context'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Notifier } from 'react-native-notifier'
import { Icon } from 'react-native-elements'

export default class QRCodeScannedScreen extends Component<
    NativeStackScreenProps<RootStackParamList, 'ScannedQRScreen'>
> {
    /**
     * Context
     */
    static contextType: typeof Context = Context
    //@ts-ignore - エラー回避の方法が思いつかない。抽象にしても宣言にしてもすべてエラーではじかれるから萎えた。
    context !: ContextType<typeof Context>

    public readonly HTTP_PORT: number = 8771

    state = {
        clientId: null,
        clientName: null,
        clientModel: null,
        isLoadSuccess: false,
        isReciving: false,
    }

    componentDidMount(): void {
        this.getUserInfomation()
    }


    async getUserInfomation() {
        if (typeof this.context.selectedService == "undefined") return;
        console.log(this.context.selectedService, "fetching")
        const user = await fetch(`http://${this.context.selectedService}:${this.HTTP_PORT}/info`)
            .catch(err => {
                this.context.logs.push({ emoji: "🤬", message: "Failed to fetch. Fetch promise was not establish." })
                this.context.logs.push({ emoji: "🤬", message: "Stack trase" })
                this.context.logs.push({ emoji: "🤬", message: err })

                console.log(`fetch error : ${err}`)
                Notifier.showNotification({
                    title: "エラー",
                    description: "ユーザ情報の取得に失敗しました。もう一度やり直してください。",
                    duration: 5000,
                })
                this.props.navigation.goBack()
                return;
            })
        if (!(user instanceof Response)) return;
        console.log(user.status)
        if (user.status !== 200) {
            this.context.logs.push({ emoji: "🤬", message: "Failed to fetch. HTTP response wasn't returned 200." })
            this.context.logs.push({ emoji: "🤬", message: "HTTP STATUS trase" })
            this.context.logs.push({ emoji: "🤬", message: user.status.toString() })

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
        console.log(this.context.selectedService)
        this.setState({
            isReciving: true
        })

        const response = await fetch(`http://${this.context.selectedService}:${this.HTTP_PORT}/stream`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ip: this.context.ip
            })
        }).catch(err => {
            this.context.logs.push({ emoji: "🤬", message: "Failed to fetch. Fetch promise was not establish." })
            this.context.logs.push({ emoji: "🤬", message: "Stack trase" })
            this.context.logs.push({ emoji: "🤬", message: err })

            console.log(`fetch error : ${err}`)
            Notifier.showNotification({
                title: "エラー",
                description: "送信者の許可に失敗しました。もう一度やり直してください。",
                duration: 5000,
            })
            this.props.navigation.goBack()
            return;
        })

        console.log(response)

        if (!(response instanceof Response)) return;

        const json = await response.json() as { status: string }
        console.log(json)
        if (json.status == "NG") {
            Notifier.showNotification({
                title: "エラー",
                description: "送信者の許可に失敗しました。もう一度やり直してください。",
                duration: 5000,
            })
            this.props.navigation.goBack()
            return;
        }

        if (response.status !== 200) {
            this.context.logs.push({ emoji: "🤬", message: "Failed to fetch. HTTP response wasn't returned 200." })
            this.context.logs.push({ emoji: "🤬", message: "HTTP STATUS trase" })
            this.context.logs.push({ emoji: "🤬", message: response.status.toString() })

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
        if (this.state.isLoadSuccess) {
            return (
                <SafeAreaView style={styles.container}>
                    <RNScrollView>
                        <View style={styles.flexBetween}>
                            <View>
                                <View style={[styles.flexCenter, styles.udpadding]}>
                                    <View style={styles.flexCenter}>
                                        <Icon
                                            name="smartphone"
                                            size={64}
                                        />
                                        <PaperText style={{ fontSize : 30 }}>{this.state.clientName}</PaperText>
                                    </View>
                                    <PaperText>( DeviceType : {this.state.clientModel} , IP : { this.context.selectedService })</PaperText>
                                </View>
                                <View style={[styles.flexCenter, styles.udpadding]}>
                                    <PaperText style={{ fontSize: 20 }}> このデバイスの画像を受信しますか？</PaperText>
                                    <View style={styles.flexUpMerginAndRow}>
                                        <PaperButton
                                            icon="download" mode='contained-tonal'
                                            onPress={() => this.checkSenderClient()}
                                            disabled={this.state.isReciving}
                                        >共有を許可する</PaperButton>
                                        <PaperButton
                                            icon="close" mode='contained-tonal'
                                            onPress={() => {
                                                this.context.setObjectState({
                                                    selectedService: null
                                                })
                                                this.props.navigation.navigate("SelectImageInitScreen")
                                            }}
                                            disabled={this.state.isReciving}
                                        >許可をしない</PaperButton>
                                    </View>
                                </View>
                            </View>
                            
                        </View>
                    </RNScrollView>
                </SafeAreaView>
            )
        }

        return (
            <SafeAreaView style={styles.container}>
                <RNScrollView>
                    <View style={styles.flexCenter}>
                        <PaperText>情報を取得しています・・・</PaperText>
                    </View>
                </RNScrollView>
            </SafeAreaView>
        )
    }
}

const styles = StyleSheet.create({
    flexUpMerginAndRow: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        gap: 10
    },
    container: {
        flex: 1,
        marginLeft: 10,
        marginRight: 10,
        marginBottom: 10,
        height: "100%",
    },
    flexCenter: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
        gap: 5
    },
    flexBetween: {
        flex: 1,
        justifyContent: "space-between",
        alignItems: "center",
        height: "100%",  
    },
    udpadding: {
        paddingTop: 10,
        paddingBottom: 10
    },
})

QRCodeScannedScreen.contextType = Context