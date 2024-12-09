import { Component, useEffect, useState } from "react";
import nfcManager, { NfcEvents, NfcTech } from "react-native-nfc-manager";
import { View , Text } from "react-native";


export default function NFCWaitingScreen() {

    const [ tag , setTag ] = useState<any>(null);

    useEffect(() => {
        nfcWait();
        return () => {
            nfcManager.cancelTechnologyRequest();
            nfcManager.setEventListener(NfcEvents.DiscoverTag, null);
        }
    }, [])

    async function onTagDiscovered(tag: any) {
        console.log(tag);
    }

    async function nfcWait() {
        if(!nfcManager.isSupported()) return;
        await nfcManager.start();
        try {
            await nfcManager.requestTechnology(NfcTech.Ndef);
            nfcManager.setEventListener( NfcEvents.DiscoverTag, onTagDiscovered );
            const tag = await nfcManager.getTag();
            setTag(tag);
        } catch(e){
            console.error(e);
        } finally {
            nfcManager.cancelTechnologyRequest();
            await nfcManager.close();
        }
    }

    return (
        <View>
            <Text>Waiting for NFC...</Text>
            <Text>{tag ?? "なし"}</Text>
        </View>
    );
}