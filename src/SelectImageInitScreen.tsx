import { Component, ContextType } from "react";
import { NativeStackScreenProps } from 'react-native-screens/lib/typescript/native-stack/types';
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet, GestureResponderEvent, Text } from "react-native";
import { ScrollView as RNScrollView } from 'react-native-gesture-handler';
import { Button, Text as PaperText } from "react-native-paper";
import { ImageLibraryOptions, launchImageLibrary } from "react-native-image-picker";

import { RootStackParamList } from "../types";
import { Context } from '../components/context';
import { AutoHeightImage } from "../components/autosizedImage";
import QRCode from "react-native-qrcode-svg";
import { pick } from "@react-native-documents/picker";

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
        qrURL: null,
        isPreviewOpen: false,
        isFile: false,
        isQROpen: false,
    }

    public async selectFile( e: GestureResponderEvent ){
        try {
            const [ result ] = await pick({
                mode: "open"
            })

            if( !result ) return;
            if( !result.uri ) return;

            const isImage = /jpg|jpeg|png|gif|bmp|webp|tiff|svg|image/i.test( result.uri );

            const name = result.name == null ? "quickshare_file_" + Date.now() + "_data" : result.name.split('.')[0]

            console.log( result.uri, isImage, name );

            this.context.setObjectState({
                image: [{
                    uri: result.uri,
                    isFile: !isImage,
                    name
                }]
            })
            this.setState({
                isFile: true,
                isPreviewOpen: true
            })
        } catch( e ){
            console.error( e )
        }
    }

    public selectSender() {
        if (this.context.image === null) return;
        this.props.navigation.navigate('SelectSenderScreen')
    }

    public createShareQR() {
        if( this.state.qrURL !== null ){
            this.setState({
                isQROpen: !this.state.isQROpen,
            })
            return;
        }
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
            qrURL: qrURL,
            isQROpen: true
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
                            <Button mode="elevated" disabled={( this.state.qrURL !== null && this.state.isQROpen) } onPress={(e) => this.props.navigation.navigate('ScanQRScreen')}>
                                共有QRコードをスキャンする
                            </Button>
                            {
                                !this.context.image && <Button mode="elevated" onPress={(e) => this.selectFile(e)}>
                                    画像を選択する
                                </Button>
                            }           
                            {
                                this.context.image && (
                                    <Button mode={ this.state.isPreviewOpen ? "contained-tonal" : "outlined"} onPress={() => this.setState({ isPreviewOpen: !this.state.isPreviewOpen })}>
                                        {this.state.isPreviewOpen ? "プレビューを閉じる" : "プレビューを開く"}
                                    </Button>
                                )
                            }
                        </View>

                        <View style={styles.flexCenter}>
                            {
                                this.state.isPreviewOpen && this.context.image && 
                                    [...( Array.isArray( this.context.image )
                                        ? this.context.image 
                                        : [this.context.image])].map(
                                            (uri, index) => (
                                                uri.isFile ? <Text key={index}> File </Text> :
                                                <AutoHeightImage 
                                                    style={styles.imageStyle} 
                                                    key={index} 
                                                    source={{ uri: uri.uri}} 
                                                    width={350} 
                                                    onDeletePut={() => {
                                                        this.state.isQROpen && this.setState({ isQROpen: false })
                                                        this.state.qrURL && this.setState({ qrURL: null })
                                                        this.context.setObjectState({ image : null })
                                                    }} /> 
                                            )
                                        )
                            }
                        </View>
                        <View style={styles.flexColumn}>
                            {this.context.image &&
                                <Button mode="contained" onPress={() => this.selectSender()}>
                                    送信先を選択する
                                </Button>
                            }
                            {this.context.image &&
                                <Button mode="contained" onPress={() => this.createShareQR()}>
                                    共有QRコードを{ this.state.isQROpen ? "隠す" : "表示する"}
                                </Button>
                            }
                            {this.state.isQROpen && this.state.qrURL &&
                                <View style={styles.flexCenter}>
                                    <QRCode
                                        value={this.state.qrURL}
                                        size={200}
                                    />
                                </View>
                            }   
                            <Button icon="image" mode='contained-tonal' onPress={() => this.props.navigation.navigate("写真の保存")}>
                                送られてきた写真を見る
                            </Button>    
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
    imageStyle: {
        borderRadius: 13,
        borderStyle: "solid",
        borderWidth: 2,
        borderColor: "#e3e3e3",
    },
    flexCenter: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
        marginBottom: 10,
        minHeight: 100,
        minWidth: "100%"
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