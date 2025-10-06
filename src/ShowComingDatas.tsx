import { Component } from "react";
import { NativeStackScreenProps } from "react-native-screens/lib/typescript/native-stack/types";
import { RootStackParamList } from "../types";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, View } from "react-native"
import { Context } from "../components/context";
import { Button, Text } from "react-native-paper";
import { AutoHeightImage } from "../components/autosizedImage";
import RNFS from "react-native-fs";
import { Notifier, Easing } from 'react-native-notifier';
import { getFileTypeFromBuffer } from "../components/getFileTypeFromBuffer";



export default class ShowComingDatas extends Component<NativeStackScreenProps<RootStackParamList, '写真の保存'>> {

    static contextType = Context;
    //@ts-ignore
    context!: React.ContextType<typeof Context>

    getRecentData(): { uri: string, name: string }[] {
        const { recivedDatas } = this.context;
        if (recivedDatas.length === 0) {
            return [];
        }
        return recivedDatas.map((data) => ({ uri: data.uri, name: data.name }));
    }

    public getFileTypeFromBuffer(buffer: Uint8Array): string | null {
        return getFileTypeFromBuffer( buffer )
    }

    saveImage(name: string, base64: string) {
        const base64URI = base64;
        if (base64URI.length === 0) {
            return;
        }

        const path = RNFS.DownloadDirectoryPath + `/quickshare_images/${name}.${base64URI.split(';')[0].split('/')[1]}`;
        RNFS.mkdir(RNFS.DownloadDirectoryPath + "/quickshare_images").catch(() => { });
        // 保存
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
                            this.getRecentData().length > 0 ? (
                                this.getRecentData().map((data, index) => (
                                    <View key={index} style={styles.containText}>
                                        {data.uri.startsWith('data:image/') ? (
                                            <AutoHeightImage style={styles.imageStyle} width={350} source={{ uri: data.uri }} hiddenDeleteBtn />
                                        ) : (
                                            <Text> その他画像以外のファイル ({data.uri.split(',')[0]}) {data.name}</Text>
                                        )}
                                        <Button mode="contained-tonal" onPress={() => this.saveImage(data.name, data.uri)} >
                                            保存する
                                        </Button>
                                    </View>
                                ))
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
    imageStyle: {
        borderRadius: 13,
        borderStyle: "solid",
        borderWidth: 2,
        borderColor: "#e3e3e3",
    },
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
    containText: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 10,
        borderRadius: 5,
        borderWidth: 1,
        marginTop: 5,
        marginBottom: 5,
        borderColor: "#e3e3e3"
    },
    noImageText: {
        display: 'flex',
        justifyContent: 'center',
        textAlign: 'center',
    }
})