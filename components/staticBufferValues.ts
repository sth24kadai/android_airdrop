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

	/**
	 * @deprecated OMG使ってない
	 * いらない
	 */
	static getDeviceBitfield( field : number ){
		const version = field >> 5;
		const visibility = (field >> 4) & 1;
		const deviceType = (field >> 1) & 7;
		const reserved = field & 1;
		return {
			version,
			visibility,
			deviceType,
			reserved,
			bitField: (version << 5) | (visibility << 4) | (deviceType << 1) | reserved
		}
	}

		
	static getTextRecodeValue( buffer : Uint8Array ) {
		console.log(
			buffer
		)
		const version = buffer[0] >> 5;
		const visibility = (buffer[0] >> 4) & 1;
		const deviceType = (buffer[0] >> 1) & 7;
		const reserved = buffer[0] & 1;
		const bitField = (version << 5) | (visibility << 4) | (deviceType << 1) | reserved;
		const randomBytes = buffer.slice(1, 17);
		const nameLength = buffer[17];
		const nameChars = buffer.slice(18, 18 + nameLength);

		return {
			version,
			visibility,
			deviceType,
			reserved,
			bitField,
			randomBytes,
			nameLength,
			nameChars
		}
	}


}