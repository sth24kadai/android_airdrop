import { Platform } from "react-native"
import { Service } from "react-native-zeroconf"
import { Ask } from "./airdrop.ask"

export interface InternalState {
	isScanning: boolean
	selectedService: string | null
	services: { [key: string]: Service & { clientName : string, clientModel : string } }
	logs: {
		emoji: string,
		message: string
	}[],
	showLogs: boolean,
	image: string | null,
	senderData: Ask | null,
	notification: Notification | null
	showsDetailDisplay : boolean 
	recivedDatas : { from : string, bytes : number, data : Buffer }[]
}

export interface Notification {
	emoji: string,
	message: string
}

type HASH = string

export interface HTTPImageRequest {
	from : HASH
	status : string,
	image : string
}

export interface HTTPImageFrom {
	id : string
	name : string
	model : typeof Platform.OS
}