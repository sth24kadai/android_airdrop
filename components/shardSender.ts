import { NativeStackScreenProps } from "react-native-screens/lib/typescript/native-stack/types";
import { HTTPBufferRequest, HTTPImageFrom, RootStackParamList } from "../types";
import { Component } from "react";
import { Service } from "react-native-zeroconf";
import { Easing, Notifier } from "react-native-notifier";
import DeviceInfo from "react-native-device-info";
import { Platform } from "react-native";
import { Buffer } from "buffer";
import RNFS from "react-native-fs";
import { getFileTypeFromBuffer, calcuateEstimate } from "./";
const {
    showNotification
} = Notifier;

/**
 * Implements shard sending functionality
 * 
 * This class extends React.Component and provides methods to send images in shards to a specified service.
 */
export class ShardSender<T extends (keyof RootStackParamList) | null> extends Component<
    T extends keyof RootStackParamList ? NativeStackScreenProps<RootStackParamList, T>
    : {}
> {
    public readonly HTTP_PORT: number = 8771
    public readonly BYTES: number = 32768 * 2 // 64KB 

    public isSending: boolean = false
    public startTime: number = 0
    public estimate: number = 0
    private sendedShardLength: number = 0

    public getFileTypeFromBuffer(buffer: Uint8Array): string | null {
        return getFileTypeFromBuffer(buffer);
    }

    public async __fetch_file_for_android__(fileUri: string): Promise<{ buf: Buffer, mineType: string }> {
        const result = await RNFS.readFile(fileUri, "base64");
        const buffer = Buffer.from(result, 'base64');
        console.log(`Read file from ${fileUri}, size: ${buffer.byteLength} bytes`)
        const mineType = this.getFileTypeFromBuffer(new Uint8Array(buffer));
        console.log(`Detected mime type: ${mineType}`)
        if (typeof mineType === "undefined") {
            return { buf: buffer, mineType: "application/octet-stream" };
        }
        return { buf: buffer, mineType: mineType ?? "application/octet-stream" };
    }

    public async getAllImages(paths: { uri: string, isFile: boolean, name: string }[] | { uri: string, isFile: boolean, name: string }): Promise<{ mineType: string, buffer: Buffer, name: string }[]> {
        const path = (Array.isArray(paths) ? paths : [paths])

        const url = await Promise.all(
            path.map(async (path) => {
                if (!path.uri) return;
                if (path.uri.startsWith("content://") && Platform.OS === "android") {
                    const buff = await this.__fetch_file_for_android__(path.uri);
                    return {
                        buff: buff.buf,
                        mineType: buff.mineType,
                        isFile: path.isFile,
                        name: path.name
                    };
                } else {
                    const response = await fetch(path?.uri.replace("file:///", "file:/") || "");
                    if (!response.ok) throw new Error(`Failed to fetch image from ${path?.uri || ""}`);
                    const buff = Buffer.from(await response.arrayBuffer());
                    return {
                        buff,
                        mineType: response.headers.get('content-type')?.toLocaleLowerCase() || "image/png",
                        isFile: path.isFile,
                        name: path.name
                    }
                }
            })
                .filter(async (v) => typeof (await v) !== "undefined") as Promise<{ buff: Buffer, mineType: string, isFile: boolean, name: string }>[]
        );
        return url.map((data) => ({
            buffer: data.buff,
            mineType: data.mineType,
            isFile: data.isFile,
            name: data.name
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
        image: { uri: string, isFile: boolean, name: string }[] | { uri: string, isFile: boolean, name: string } | null,
        selectedService: string | null,
        callbackFunction?: (sentShards: HTTPBufferRequest[]) => void
    ) {
        if (
            selectedService === null ||
            image === null
        ) return;


        this.isSending = true
        this.startTime = Date.now()

        const imageBuffers = await this.getAllImages(image);
        console.log(imageBuffers.map((v, i) => `${i}: ${v.mineType}`).join(", "))
        console.log(`Fetched ${imageBuffers.length} images to send. ${imageBuffers.reduce((acc, v) => acc + v.buffer.byteLength, 0)} bytes`)
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
            this.sendedShardLength = 0;
            await Promise.all(
                imageBuffers.map(async (imageBuffer, index, totalArray) => {
                    console.log(`Sending image ${index + 1} of ${totalArray.length}, ${imageBuffer.name} size: ${imageBuffer.buffer.byteLength} bytes, type: ${imageBuffer.mineType}`)
                    await this.shardSend(
                        imageBuffer.buffer,
                        service.host,
                        imageBuffer.mineType,
                        index + 1,
                        totalArray.length,
                        imageBuffer.name,
                        callbackFunction
                    )
                })
            )
        }
    }

    public async shardSend(
        rawData: Buffer,
        ipAddress: string,
        contentType: string,
        TOTALindex: number,
        total: number,
        name: string,
        callback?: (sentShards: HTTPBufferRequest[]) => void
    ) {
        const shards = this.shardProsessor(rawData, this.BYTES);
        const fromData = await ShardSender.fromDeviceCreate();
        const hashedFromData = Buffer.from(
            JSON.stringify(fromData)
        ).toString("base64")

        const uniqueSendID = (Date.now() + Math.round(Math.random() * 100)).toString(16)

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
                    index: index,
                    name: name,
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
                } else {
                    this.sendedShardLength++;
                    this.estimate = calcuateEstimate(
                        toStringedDatas.length,
                        this.sendedShardLength,
                        this.estimate
                    )
                }

                if (toStringedDatas.length === index + 1) {
                    console.log(`Send completed ${Date.now() - this.startTime} ms`)
                    showNotification({
                        title: `送信が完了しました。 かかった時間：${Date.now() - this.startTime} ms`,
                        description: `シャード個数 ${toStringedDatas.length} shards, トータル ${Math.round((rawData.byteLength / 1024 / 1024) * 10) / 10} MB`
                    })
                    console.log(`total : ${total}, index : ${TOTALindex}`)
                    if (total === TOTALindex) {
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

    public static async fromDeviceCreate(): Promise<HTTPImageFrom> {
        return ({
            id: await DeviceInfo.getUniqueId(),
            name: DeviceInfo.getModel(),
            model: Platform.OS
        })
    }
}