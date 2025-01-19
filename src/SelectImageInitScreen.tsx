import { Component, ContextType } from "react";
import { NativeStackScreenProps } from 'react-native-screens/lib/typescript/native-stack/types';
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet, GestureResponderEvent } from "react-native";
import { ScrollView as RNScrollView } from 'react-native-gesture-handler';
import { Button, Text as PaperText } from "react-native-paper";
import { ImageLibraryOptions, launchImageLibrary } from "react-native-image-picker";

import { RootStackParamList } from "../types";
import { Context } from '../components/context';
import { AutoHeightImage } from "../components/autosizedImage";
import QRCode from "react-native-qrcode-svg";

export default class SelectImageInitScreen extends Component<NativeStackScreenProps<RootStackParamList, 'SelectImageInitScreen'>> {

    /**
     * 共有Context
     */
    static context = Context;
    /**
     * 実装Context
     */
    // @ts-ignore
    context !: ContextType<typeof Context>
    public state = {
        qrURL: null
    }

    public selectImage(e: GestureResponderEvent) {
        const option: ImageLibraryOptions = {
            mediaType: "photo",
            quality: 1,
            includeBase64: true
        }

        launchImageLibrary(option, (responseImage) => {
            if (responseImage.didCancel) {
                return;
            }
            else if (
                responseImage.errorMessage ||
                responseImage.errorCode
            ) {
                return;
            }
            else {
                if (
                    responseImage.assets === null ||
                    responseImage.assets?.length === 0 ||
                    !Array.isArray(responseImage.assets)
                    //typeof responseImage.assets[0].base64 === "undefined"
                ) return;
                //console.log( responseImage.assets[0] );

                this.context.setObjectState({
                    image: responseImage.assets[0].uri
                })
            }
        })
    }

    public selectSender() {
        if (this.context.image === null) return;
        this.props.navigation.navigate('SelectSenderScreen')
    }

    public createShareQR() {
        // irtghuiruthiurtgiouhjtgiojtghioutghiojetgijorfgipjrfgipjrfgijpfgijfgshiuodfgijodfgijgiojgd
        if (this.context.image === null) return;
        const selfIP = this.context.ip;
        if( selfIP === null ) return;
        const toHEXString = ( str : string ) => {
            return str.split('').map( (c) => c.charCodeAt(0).toString(16) ).join('');
        }
        const indentifer = "qs"
        const mode = 1;
        const toHEXIP = toHEXString(selfIP);
        const lengthSelfIP = toHEXIP.length;
        const qrURL = `${indentifer}${mode}${lengthSelfIP}${toHEXIP}`;
        this.setState({
            qrURL: qrURL
        })
    }

    render() {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    <RNScrollView>
                        <View style={styles.udpadding}>
                            <PaperText variant="headlineMedium">
                                ShareImage
                            </PaperText>
                        </View>
                        <View style={styles.flexColumn}>
                            <Button mode="contained-tonal" onPress={(e) => this.selectImage(e)}>
                                画像を選択する
                            </Button>           
                            <Button mode="contained-tonal" disabled={this.state.qrURL !== null} onPress={(e) => this.props.navigation.navigate('ScanQRScreen')}>
                                共有QRコードをスキャンする
                            </Button>
                        </View>
                        <View style={styles.flexCenter}>
                            {this.context.image && <AutoHeightImage onDeletePut={() => this.context.setObjectState({ image: null })} source={{ uri: this.context.image }} width={350} />}
                        </View>
                        <View style={styles.flexColumn}>
                            {this.context.image &&
                                <Button mode="contained" onPress={() => this.selectSender()}>
                                    送信先を選択する
                                </Button>
                            }
                            {this.context.image &&
                                <Button mode="contained" onPress={() => this.createShareQR()}>
                                    共有QRコードを表示する
                                </Button>
                            }
                            {this.state.qrURL &&
                                <View style={styles.flexCenter}>
                                    <QRCode
                                        value={this.state.qrURL}
                                        size={200}
                                    />
                                </View>
                            }       
                            <Button icon="archive" mode='contained-tonal' onPress={() => this.props.navigation.navigate('LogScreen')}>
                                デバックログを確認する
                            </Button>
                        </View>
                    </RNScrollView>
                </SafeAreaView>
            </SafeAreaProvider>
        )
    }
}

const styles = StyleSheet.create({
    flexCenter: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
        marginBottom: 10,
    },
    title: {
        fontSize: 30,
        paddingTop: 10,
        paddingBottom: 10,
    },
    titleButSmall: {
        fontSize: 20,
    },
    flexColumn: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
    },
    upadding: {
        paddingTop: 10,
    },
    udpadding: {
        paddingTop: 10,
        paddingBottom: 10
    },
    textWithIconNotBackground: {
        display: 'flex',
        flexDirection: 'row',
        alignContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        gap: 10,
        fontSize: 30,
    },
    textWithIcon: {
        display: 'flex',
        flexDirection: 'row',
        alignContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        gap: 10,
        fontSize: 30,
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 10
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
        marginTop: 10,
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

SelectImageInitScreen.contextType = Context