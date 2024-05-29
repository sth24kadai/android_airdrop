
/**
 * copied from https://zenn.dev/toshiyuki/articles/4791ccada2ba7e
 * Thanks :)
 */

import React, { useEffect, useState } from 'react'
import { Image, ImageRequireSource, ImageStyle, ImageURISource, StyleProp } from 'react-native'


export const AutoHeightImage: React.FC<{
    source: ImageURISource | ImageRequireSource
    width: number
    style?: StyleProp<ImageStyle>
}> = (props) => {
    const { source, style, width } = props
    const [height, setHeight] = useState<number>(0)

    useEffect(() => {
        if (typeof source === 'number') {
            const originalSize = Image.resolveAssetSource(source)
            const newHeight = width * originalSize.height / originalSize.width
            setHeight(newHeight)
        } else if (source?.uri) {
            Image.getSize(source.uri,
                (originalWidth, originalHeight) => {
                    const newHeight = width * originalHeight / originalWidth
                    setHeight(newHeight)
                }
            )
        }
    }, [source, width])

    return (
        <Image source={source} resizeMode='contain' style={[{ height, width }, style]} />
    )
}