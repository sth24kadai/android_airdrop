import { Platform } from "react-native";

export class StaticBufferValues {
    static random8BitArrayGenerate() : Uint8Array {
		const randomStrings = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split('').map( v => v.charCodeAt(0) );
		const bytesStrings : number[] = [];

		for( let i = 0; i < 3 ; i++ ) {
			bytesStrings.push(randomStrings[Math.floor(Math.random() * randomStrings.length)])
		}

		return Uint8Array.from(bytesStrings);
	}

	static textRecodeGenerate() : Uint8Array {
		const endpointId = StaticBufferValues.random8BitArrayGenerate();

		return Uint8Array.from([
			0x23, 
			endpointId[0], endpointId[1], endpointId[2], endpointId[3],
			0xFC, 0x9F, 0x5E,
			0, 0
		]);
	}


}