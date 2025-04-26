import { NativeStackScreenProps } from "react-native-screens/lib/typescript/native-stack/types";
import { HTTPBufferRequest, HTTPImageFrom, RootStackParamList } from "../types";
import { Component } from "react";
import { Service } from "react-native-zeroconf";
import { Easing, Notifier } from "react-native-notifier";
import DeviceInfo from "react-native-device-info";
import { Platform } from "react-native";
import { Buffer } from "buffer";
const {
    showNotification
} = Notifier;

export class ShardSender<T extends (keyof RootStackParamList) | null> extends Component<
    T extends keyof RootStackParamList ? NativeStackScreenProps<RootStackParamList, T>
    : {}
> {
    public readonly HTTP_PORT: number = 8771
    public readonly BYTES: number = 32768 * 2 // 64KB 

    public isSending: boolean = false
    public startTime: number = 0


    public async getAllImages( paths : string[] | string ): Promise<{ mineType: string, buffer: Buffer }[]> {
        const path = ( Array.isArray( paths ) ? paths : [paths])
       
        const url = await Promise.all( path.map( async ( path ) => {
            const response = await fetch( path )
            const buff = Buffer.from( await response.arrayBuffer() );
            return {
                buff,
                mineType: response.headers.get('content-type')?.toLocaleLowerCase() || "image/png",
            }
        }))
        return url.map( ( data ) => ({
            buffer: Buffer.from( data.buff ),
            mineType: data.mineType
        }));
    }

    /**
     * 
     * @param service Service Object 
     * @param image URL
     * @param selectedService String
     * @returns 
     */   
    public async sendImage(
        service: Service, 
        image: string[] | string | null, 
        selectedService: string | null,
        callbackFunction?: ( sentShards : HTTPBufferRequest[] ) => void
    ) {
        if (
            selectedService === null ||
            image === null
        ) return;

        this.isSending = true
        this.startTime = Date.now()

        const imageBuffers = await this.getAllImages( image );
        const askResponse = await fetch(`http://${service.host}:${this.HTTP_PORT}/device/ping`, {
            method: "POST",
            headers: {
                "Content-type": "application/json"
            }
        }).catch((err) => {
            this.setState({ isSending: false })
            showNotification({
                title: 'エラーが発生しました',
                description: `承認されませんでした。`,
                duration: 5000,
                showAnimationDuration: 800,
                showEasing: Easing.ease,
                hideEasing: Easing.ease,
            })

            return;
        })
        // catchでvoidになるので
        if (typeof askResponse === "undefined") return;

        if (askResponse.ok) {
            showNotification({
                title: '送信中です。',
                description: `写真を送信しています。`,
                duration: 5000,
                showAnimationDuration: 800,
                showEasing: Easing.ease,
                hideEasing: Easing.ease,
            })

            if (typeof imageBuffers === "undefined") return;
            await Promise.all(
                imageBuffers.map(async (imageBuffer, index, totalArray) => {
                    await this.shardSend(
                        imageBuffer.buffer, 
                        service.host, 
                        imageBuffer.mineType, 
                        index + 1,
                        totalArray.length,
                        callbackFunction
                    )
                })
            )
        }
    }

    public async shardSend(rawData: Buffer, ipAddress: string, contentType: string, TOTALindex: number, total : number, callback?:( sentShards : HTTPBufferRequest[] ) => void ) {
        const shards = this.shardProsessor(rawData, this.BYTES);
        const fromData = await ShardSender.fromDeviceCreate();
        const hashedFromData = Buffer.from(
            JSON.stringify(fromData)
        ).toString("base64")

        const uniqueSendID = ( Date.now() + Math.round( Math.random() * 100 ) ).toString(16)

        const toStringedDatas = await Promise.all(
            shards.map(async (shard, index) => {
                const requestObject = {
                    from: hashedFromData,
                    status: "SHARD_POSTING",
                    uri: shard.toString("binary"),
                    totalShards: shards.length,
                    shardIndex: index,
                    imgType: contentType,
                    totalImageIndex: total,
                    uniqueId: uniqueSendID,
                    index: index
                }
                const stringifyData = JSON.stringify(requestObject)
                return stringifyData
            })
        )

        await Promise.all(
            toStringedDatas.map(async (datum, index) => {
                const response = await fetch(`http://${ipAddress}:${this.HTTP_PORT}/stream`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: datum
                })

                if (!response.ok) {
                    this.isSending = false
                    showNotification({
                        title: 'エラーが発生しました。',
                        description: `シャード(#${index})の送信に失敗しました。`,
                        duration: 5000,
                        showAnimationDuration: 800,
                        showEasing: Easing.ease,
                        hideEasing: Easing.ease,
                    })
                }

                if (toStringedDatas.length === index + 1) {
                    console.log(`Send completed ${Date.now() - this.startTime} ms`)
                    showNotification({
                        title: `送信が完了しました。 かかった時間：${Date.now() - this.startTime} ms`,
                        description: `シャード個数 ${toStringedDatas.length} shards, トータル ${Math.round((rawData.byteLength / 1024 / 1024) * 10) / 10} MB`
                    })
                    console.log(`total : ${total}, index : ${TOTALindex}`)
                    if( total === TOTALindex ) {
                        callback &&
                        callback(
                            toStringedDatas.map((data, index) => 
                                 JSON.parse(data) as HTTPBufferRequest
                            )
                        )
                        console.log(`typeof callbackFunction : ${typeof callback}`)
                        return Promise.resolve();
                    }
                }
            })
        )
    }

    public shardProsessor(data: Buffer, size: number = 32768) {
        const totalShards = Math.ceil(data.byteLength / size)
        const shards: Buffer[] = []
        for (let i = 0; i < totalShards; i++) {
            const shard = data.subarray(i * size, (i + 1) * size)
            shards.push(shard)
        }
        console.log(`Sharded ${shards.length} shards, each shard is ${size} bytes`)
        return shards
    }

    public static async fromDeviceCreate() : Promise< HTTPImageFrom > {
        return ({
			id: await DeviceInfo.getUniqueId(),
			name: DeviceInfo.getModel(),
			model: Platform.OS
		})
    }
}