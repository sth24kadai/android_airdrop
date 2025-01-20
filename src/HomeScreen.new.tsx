import { Component, ContextType } from 'react';
import React from 'react';
import {
    StyleSheet,
    TouchableOpacity,
    Text,
    FlatList,
    RefreshControl,
    View
} from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import SafeAreaView from 'react-native-safe-area-view';
import {
    Icon,
    ListItem
} from "react-native-elements"
import Zeroconf from "react-native-zeroconf"
import type { Service } from 'react-native-zeroconf';
import {
    ActivityIndicator,
    Button as PaperButton
} from "react-native-paper"
import { Buffer } from "buffer"
import { NativeStackScreenProps } from 'react-native-screens/lib/typescript/native-stack/types';
import { RootStackParamList } from '../types';
import { Context } from '../components/context';
import { NetworkInfo } from 'react-native-network-info';
import { Notifier } from 'react-native-notifier';
import nfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';

/**
 * Zeroconfインスタンスを生成
 */
const zeroconf = new Zeroconf()

export default class HomeScreen extends Component<
    NativeStackScreenProps<RootStackParamList, "デバイスの選択">
> {

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
        ip: null
    }
    /**
     * Zeroconfのインターバルハンドラ変数
     */
    private timeout: NodeJS.Timeout | null = null;
    /**
     * HTTPポート（定数)
     */
    private readonly HTTP_PORT: number = 8771

    private get random8BitArrayGenerate(): Uint8Array {
        const randomNumbers: number[] = [];

        for (let i = 0; i < 6; i++) {
            randomNumbers.push(
                Math.floor(
                    Math.random() * 256
                )
            )
        }

        return Uint8Array.from(randomNumbers)
    }

    private async getDeviceName(service: Service) {
        const response = await fetch(`http://${service.host}:${this.HTTP_PORT}/info`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        ).catch((err) => {
            Notifier.showNotification({
                title: "デバイスの詳細取得に失敗しました。",
                description: `詳細： ${service.host}の取得に失敗しました。\n 原因：${err}`,
            })

            return null;
        })

        if (!(response instanceof Response)) return null;
        if (response.ok) {
            const data = await response.json() as { status: string, data: { clientId: string, clientName: string, clientModel: string } };
            return data;
        } else {
            Notifier.showNotification({
                title: "デバイスの詳細取得に失敗しました。",
                description: `詳細：相手サーバーがレスポンスエラーを発生させました。`
            })
        }

        return null;
    }

    private mDNSEventHandlers() {
        /* mDNSサービスを開始 */
        zeroconf.publishService(
            /* サービス名 */
            'FC9F5ED42C8A',
            /* プロトコル */
            'tcp',
            /* ドメイン */
            'local',
            /* ホスト名 */
            Buffer.from(this.random8BitArrayGenerate).toString('base64'),
            /* 使用ポート */
            5353
        )

        zeroconf.on('start', () => {
            this.context.setObjectState({ isScanning: true })
            this.context.logs.push({
                emoji: '🔍',
                message: 'Started scanning and lunching the mDNS service...'
            })

        })

        zeroconf.on('stop', () => {
            this.context.setObjectState({ isScanning: false })
            this.context.logs.push({
                emoji: '🛑',
                message: 'Stopped scanning'
            })
        })

        zeroconf.on('update', () => {
            this.context.logs.push({
                emoji: '🔄',
                message: 'Updating Data...'
            })
        })

        zeroconf.on('resolved', async service => {
            this.context.logs.push({
                emoji: '🐉',
                message: `Resolved ${service.name} (${service.host})`
            })
            this.context.logs.push({
                emoji: '🔗',
                message: JSON.stringify(service)
            })

            const deviceName = await this.getDeviceName(service)
            if (deviceName !== null) {
                this.context.logs.push({
                    emoji: '📱',
                    message: `Fetch Success: ${JSON.stringify(deviceName.data.clientId)} -  ${deviceName.data.clientName} (${deviceName.data.clientModel})`
                })
            }

            if (deviceName === null) return;

            const newService = Object.assign(service, deviceName !== null ? deviceName.data : {}) as Service & { clientName: string, clientModel: string }

            this.context.setObjectState({
                services: {
                    ...this.context.services,
                    [service.host]: newService,
                },
            })
        })


        zeroconf.on('error', err => {
            this.context.setObjectState({ isScanning: false })
            this.context.logs.push({
                emoji: '🚨',
                message: `Error: ${err}`
            })
        })
    }

    public async nfcRequest() {
        await nfcManager.cancelTechnologyRequest().catch(() => 0)
        try {
            await nfcManager.requestTechnology([NfcTech.Ndef], {
                alertMessage: "ファイルを送信する端末をNFCタグに近づけてください"
            })
            await nfcManager.getTag()
            const bytes = Ndef.encodeMessage([Ndef.uriRecord(`nd:${this.state.ip}`)]);

            if (bytes) {
                await nfcManager.ndefHandler.writeNdefMessage(bytes);
                //const message = await nfcManager.ndefHandler.getNdefMessage()
				//console.log("NFC Message", message)
                console.log("Wrote ndef message", bytes)
                await nfcManager.close().catch(() => 0)
            }
        } catch (err) {
            nfcManager.cancelTechnologyRequest().catch(() => 0)
            console.log(err)
        } finally {
            nfcManager.cancelTechnologyRequest().catch(() => 0)
            console.log("NFC Request Done")
        }
    }


    private renderRow({ item, index }: { item: string, index: number }) {
        const { name, fullName, host, addresses, clientModel, clientName } = this.context.services[item];

        return (
            <TouchableOpacity
                onPress={() => {
                    this.context.setObjectState({
                        selectedService: host
                    });
                    this.props.navigation.navigate('DetailScreen')
                }}
                style={[
                    styles.textWithIcon, styles.upadding
                ]}
            >
                <Icon name="smartphone" size={35} />
                <ListItem.Content>
                    <ListItem.Title style={styles.titleButSmall}>{clientName ?? fullName.split('.')[0]}</ListItem.Title>
                    <ListItem.Subtitle>{fullName} / {addresses.join(',')}</ListItem.Subtitle>
                </ListItem.Content>
            </TouchableOpacity>
        )
    }

    private refreshData() {
        const { isScanning } = this.context;
        if (isScanning) return;

        this.context.setObjectState({
            services: {}
        });

        zeroconf.scan('FC9F5ED42C8A', 'tcp', 'local.')

        this.timeout && clearTimeout(this.timeout); // 現在のインターバルをリセットする
        this.timeout = setTimeout(() => {
            zeroconf.stop();
        }, 1000 * 5) // 五秒後にスキャンを停止する;
    }

    componentDidMount() {
        this.refreshData()
        nfcManager.isSupported().then(supported => {
            if (supported) {
                nfcManager.start()
                console.log("NFC is supported, start")
            }
        })
        this.mDNSEventHandlers()
        NetworkInfo.getIPV4Address().then(v => {
            this.setState({
                ip: v
            }) // 自身の追跡用にIPを決定させておく
        })
    }

    componentWillUnmount(): void {
        zeroconf.stop();
    }

    render() {
        const { services, selectedService, isScanning } = this.context

        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    <Text style={styles.title}> NearDrop </Text>
                    <Text style={styles.titleButSmall}> あなたのIP : {this.state.ip ?? ""}</Text>
                    <View style={styles.flexColumn}>
                        <Text style={styles.udpadding}>検出されたデバイス一覧</Text>
                        {
                            isScanning ? (
                                <>
                                    <View style={styles.textWithIconNotBackground}>
                                        <ActivityIndicator size="small" />
                                        <Text>付近のデバイスを検索中</Text>
                                    </View>
                                </>
                            ) : (
                                <>
                                    <FlatList
                                        data={Object.keys(services)}
                                        renderItem={(item) => this.renderRow(item)}
                                        keyExtractor={key => key}
                                        refreshControl={
                                            <RefreshControl
                                                refreshing={isScanning}
                                                onRefresh={() => this.refreshData()}
                                                tintColor="skyblue"
                                            />
                                        }
                                    />
                                </>
                            )
                        }
                    </View>
                    <View style={styles.udpadding}>
                        {!isScanning && (
                            <View style={styles.flexColumn}>
                                <PaperButton icon="image" mode='contained-tonal' onPress={() => this.props.navigation.navigate("写真の保存")}>
                                    写真を見る
                                </PaperButton>
                                <PaperButton icon="reload" mode='contained-tonal' onPress={() => this.refreshData()}>
                                    リロードする
                                </PaperButton>
                                <PaperButton icon="archive" mode='contained-tonal' onPress={() => this.props.navigation.navigate('LogScreen')}>
                                    デバックログを確認する
                                </PaperButton>
                                <PaperButton icon="nfc" mode='contained-tonal' onPress={() => this.nfcRequest()}>
                                    NFCでファイルを送信する
                                </PaperButton>
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            </SafeAreaProvider>
        )
    }
}

//#region Styles

const styles = StyleSheet.create({
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

HomeScreen.contextType = Context
