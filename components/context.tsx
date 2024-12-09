import React from "react";
import { Service } from "react-native-zeroconf";
import { HTTPBufferRequest, InternalState, Notification } from "../types";

export const Context = React.createContext({
    isScanning: false,
    selectedService: "" as string | null,
    services: {} as { [key: string]: Service & { clientName : string, clientModel : string } },
    recivedDatas : [] as { from : string, bytes : number, data : Buffer, uri : string }[],
    logs: [] as { emoji: string, message: string }[],
    showLogs: false,
    image: "" as string | null,
    notification: {} as Notification | null,
    showsDetailDisplay : false,
    recivedShards : [] as HTTPBufferRequest[],
    setObjectState: (state: Partial<InternalState>) => {}
});