import React, { useEffect, Component, ContextType } from 'react';
import { Image, Text, View, Animated, StyleSheet, Modal, } from 'react-native';
import { Button } from 'react-native-paper';
import NfcManager from 'react-native-nfc-manager';
import { Context } from './context';

const animValue = new Animated.Value(0);

export class NfcPromptAndroid extends Component {

    /**
 * Context
 */
    static contextType: typeof Context = Context
    //@ts-ignore - エラー回避の方法が思いつかない。抽象にしても宣言にしてもすべてエラーではじかれるから萎えた。
    context !: ContextType<typeof Context>
    // private animValue = new Animated.Value(0);

    public state = {
        message: "",
        visible: false,
        //animValue: new Animated.Value(0),
    }

    componentDidMount(): void {
        console.log("NfcPromptAndroid#componentDidMount");
        this.context.setObjectState({ showRequestNFCFlame: true });
        animValue.setValue(0);
    }

    public cancelNfcScan() {
        setTimeout(() => {
            NfcManager.cancelTechnologyRequest().catch(() => 0);
        }, 200);
        this.context.setObjectState({ showRequestNFCFlame: false });
    }

    render() {
        return (
            <Modal transparent={true} visible={true}>
                <View style={[styles.wrapper]}>
                    <View style={{ flex: 1 }} />

                    <Animated.View style={[styles.prompt, {
                        transform: [
                            {
                                translateY: animValue.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [300, 0],
                                }),
                            },
                        ],
                    }]}>
                        <View
                            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            {

                                <View
                                    style={{ width: 120, height: 120, padding: 20 }}
                                />

                            }

                            <Text>{this.state.message}</Text>
                        </View>

                        <Button mode="contained" onPress={this.cancelNfcScan}>
                            キャンセル
                        </Button>
                    </Animated.View>
                    <Animated.View style={[styles.promptBg, {
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        opacity: animValue,
                    }]} />
                </View>
            </Modal>
        )
    }
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        alignItems: 'center',
        
    },
    promptBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
    },
    prompt: {
        height: 300,
        alignSelf: 'stretch',
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        margin: 20,
        zIndex: 2,
    },
});

NfcPromptAndroid.contextType = Context
