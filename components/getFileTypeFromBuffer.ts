
export function getFileTypeFromBuffer(buffer: Uint8Array): string | null {
    const uint8arr = new Uint8Array(buffer)

    const len = 4
    if (uint8arr.length >= len) {
        let signatureArr = new Array(len)
        for (let i = 0; i < len; i++)
            signatureArr[i] = (new Uint8Array(buffer))[i].toString(16)
        const signature = signatureArr.join('').toUpperCase()

        if( /FFD8/.test(signature) ){
            return 'image/jpeg'
        }

        switch (signature) {
            case '89504E47':
                return 'image/png'
            case '47494638':
                return 'image/gif'
            case '25504446':
                return 'application/pdf'
            case 'FFD8FFDB':
            case 'FFD8FFE0':
            case 'FFD8FFE1':
                return 'image/jpeg'
            case '504B0304':
                return 'application/zip'
            case '504B34':
                return 'application/xlsx'
            case '00018':
            case '00020':
                return 'video/mp4'
            case '49492A00':
                return 'image/tiff'
            case '424D':
                return 'image/bmp'
            case '52494646':
                return 'image/webp'
            case '3C3F786D':
                return 'image/svg+xml'
            case '00024':
                return 'image/HEIC'
            default:
                return null
        }
    }
    return null
}