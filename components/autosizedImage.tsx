
/**
 * copied from https://zenn.dev/toshiyuki/articles/4791ccada2ba7e
 * Thanks :)
 */

import React, { useEffect, useRef, useState } from 'react'
import { Image, ImageRequireSource, ImageStyle, ImageURISource, StyleProp } from 'react-native'
import { View } from 'react-native'
import Video, { VideoRef } from 'react-native-video'


export const AutoHeightImage: React.FC<{
    source: ImageURISource | ImageRequireSource
    width: number
    style?: StyleProp<ImageStyle>
}> = (props) => {
    const { source, style, width } = props
    const [height, setHeight] = useState<number>(0)
    const videoRef = useRef<VideoRef | null>(null)

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

    /*
    if( typeof source !== "number" && ( source.uri && source.uri.includes('mp4') ) ){
        return (
            <Video 
                ref={videoRef}
                source={{ uri: source.uri }} 
                style={[{ height, width }, style]} 
            />
        )
    }
        */

    return (
        <Image source={source} resizeMode='contain' style={[{ height, width }, style]} />
    )
}