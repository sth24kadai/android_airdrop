

import { Component, ContextType } from "react";
import { NativeStackScreenProps } from 'react-native-screens/lib/typescript/native-stack/types';
import { StyleSheet } from "react-native";
import { Text as PaperText } from "react-native-paper";

import { RootStackParamList } from "../types";
import { Context } from '../components/context';
import { Camera, Code, getCameraDevice } from "react-native-vision-camera";
import { Notifier } from "react-native-notifier";
import { Buffer } from "react-native-buffer";

export default class ScanQRCodes extends Component<NativeStackScreenProps<RootStackParamList, "ScanQRScreen">> {

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
        permission : false,
        cameraDevice: null,
        scannedValue : null,
        readyToScan: false
    }

    componentDidMount(): void {
        const cameraPermission = Camera.getCameraPermissionStatus()
        if(cameraPermission === "denied"){
            this.getCameraPermission().then(( result ) => {
                Notifier.showNotification({
                    title: 'カメラの許可',
                    description: result ? 'カメラの許可を取得しました' : 'カメラの許可を取得できませんでした',
                    duration: 5000,
                    showAnimationDuration: 800,
                    hideOnPress: true,
                })

                this.setState({
                    permission: result
                })
                this.createCameraDevice()
            })
        }

        this.setState({
            permission: true
        })
        this.createCameraDevice()
    }

    createCameraDevice() {
        const devices = Camera.getAvailableCameraDevices()
        const device = getCameraDevice(devices, 'back')


        if( typeof device === "undefined" ){
            return null
        }

        this.setState({
            cameraDevice: device,
            readyToScan: true
        })

    }

    async getCameraPermission(){
        const newCameraPermission = await Camera.requestCameraPermission()
        if(newCameraPermission === "granted"){
            return true
        }
        return false
    }

    onCodeScanned( data : Code[] ) {
        data.map(( code ) => {
            if( code.value?.startsWith("qs") ){
                console.log(`QRShare Code Detected! ${code.value}`)
                const mode = code.value[2];
                const length = parseInt( code.value.slice(3, 5) );
                const hexip = code.value.slice(5, 5 + length);
                
                const ip = Buffer.from(hexip, 'hex').toString();
                console.log(`Mode ${mode}, length ${length}, hexIP: ${hexip}, toUTF8 ${ip}` );
                this.context.setObjectState({
                    selectedService: ip
                })
                this.state.readyToScan = false;
                this.props.navigation.navigate("ScannedQRScreen")
            }
        })
    }

    render() {
        if(
            this.state.permission &&
            this.state.cameraDevice !== null
        ) return <Camera style={styles.absolutelyFullScreen} isActive={this.state.readyToScan} device={this.state.cameraDevice} codeScanner={{ codeTypes: ["qr"], onCodeScanned: ( codes ) => this.onCodeScanned( codes ) }} />
        else return <PaperText>カメラの許可を取得してください</PaperText>
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
    absolutelyFullScreen: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: '100%',
        width: '100%'
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

ScanQRCodes.contextType = Context