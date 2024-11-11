import { Component } from "react";
import { NativeStackScreenProps } from "react-native-screens/lib/typescript/native-stack/types";
import { RootStackParamList } from "../types";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Image, ScrollView, StyleSheet, View } from "react-native"
import { Context } from "../components/context";
import { Buffer } from 'buffer';
import { Button, Text } from "react-native-paper";
import { AutoHeightImage } from "../components/autosizedImage";
import RNFS from "react-native-fs";
import { Notifier, Easing } from 'react-native-notifier';



export default class App extends Component<NativeStackScreenProps<RootStackParamList, '写真の保存'>> {

    static contextType = Context;
    //@ts-ignore
    context!: React.ContextType<typeof Context>

    getRecentData() : string {
        const { recivedDatas } = this.context;
        if (recivedDatas.length === 0) {
            return "";
        }

        return recivedDatas[recivedDatas.length - 1].uri;
    }

    getBase64URI() : string {
        const recentBufferData = this.getRecentData();
        if (recentBufferData.length === 0) {
            return "";
        }
        if( typeof recentBufferData === "string" ){
            return recentBufferData;
        }
        
        return recentBufferData;
    }

    saveImage() {
        const base64URI = this.getBase64URI();
        if (base64URI.length === 0) {
            return;
        }

        const path = RNFS.DownloadDirectoryPath + `/quickshare.${Date.now()}.${base64URI.split(';')[0].split('/')[1]}`;
        RNFS.writeFile(path, base64URI.split(',')[1], 'base64')
            .then(() => {
                Notifier.showNotification({
                    title: '保存しました',
                    description: '画像をダウンロードフォルダ内に保存しました。',
                    duration: 5000,
                    showAnimationDuration: 800,
                    showEasing: Easing.inOut(Easing.ease),
                    onHidden: () => console.log('hidden'),
                    onPress: () => console.log('press'),
                    hideOnPress: true,
                })
            })
            .catch((err) => {
                console.log(err.message);
            });
    }



    render() {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.baseFlexStyle}>
                    <ScrollView>
                        {
                            this.getBase64URI() !== "" ? (
                                <View style={styles.containText}>
                                    <Text>直近で送られたファイル</Text>
                                    <AutoHeightImage style={styles.noImageText} source={{ uri: this.getBase64URI() }} width={350} />
                                    <Button icon="download" mode="contained" onPress={() => this.saveImage()}>
                                        保存する
                                    </Button>
                                </View>
                            ) : (
                                <Text style={styles.noImageText}>最近シェアされた写真はまだないようです。</Text>
                            )
                        }
                    </ScrollView>
                </SafeAreaView>
            </SafeAreaProvider>
        )
    }
}

const styles = StyleSheet.create({
    baseFlexStyle: {
        display: 'flex',
        height: '100%',
        width: '100%',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        alignContent: 'center',
        textAlign: 'center',
    },
    containText : {
        display: "flex",
        flexDirection: "column",
        gap: 10,
    },
    noImageText: {
        display: 'flex',
        justifyContent: 'center',
        textAlign: 'center',
    }
})