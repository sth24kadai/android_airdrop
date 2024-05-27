
import {
    Buffer 
} from "buffer"

export interface Discover {
    "ReceiverMediaCapabilities" : Buffer,
    "ReciverComputerName" : string,
    "ReceiverModelName" : string,
    "ReceiverRecordData" ?: unknown,

}