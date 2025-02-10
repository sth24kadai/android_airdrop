import { Platform } from "react-native"
import { Service } from "react-native-zeroconf"

export interface InternalState {
	isScanning: boolean
	selectedService: string | null
	services: { [key: string]: Service & { clientName : string, clientModel : string } }
	logs: {
		emoji: string,
		message: string
	}[],
	showLogs: boolean,
	image: string[] | string | null,
	notification: Notification | null
	showsDetailDisplay : boolean 
	recivedDatas : { from : string, bytes : number, data : Buffer, uri: string, uniqueGroupIndex: string }[]
	recivedShards : HTTPBufferRequest[]
}

export interface Notification {
	emoji: string,
	message: string
}

type HASH = string

export interface HTTPImageRequest {
	from : HASH
	status : string,
	image ?: string
	uri : string
}

export interface HTTPBufferRequest extends HTTPImageRequest {
	shardIndex : number,
	totalShards : number,
	imgType : string
	data : Buffer
	type : string,
	index: number,
	uniqueId: string
	totalImageIndex: number
}

export interface HTTPImageFrom {
	id : string
	name : string
	model : typeof Platform.OS
}

export type { RootStackParamList } from './rootParamLists'