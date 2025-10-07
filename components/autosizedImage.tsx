
/**
 * copied from https://zenn.dev/toshiyuki/articles/4791ccada2ba7e
 * Thanks :)
 */

import React, { useEffect, useRef, useState } from 'react'
import { Button, Image, ImageRequireSource, ImageStyle, ImageURISource, StyleProp } from 'react-native'
import { View } from 'react-native'
import { VideoRef } from 'react-native-video'


export const AutoHeightImage: React.FC<{
    source: ImageURISource | ImageRequireSource
    width: number
    style?: StyleProp<ImageStyle>
    hiddenDeleteBtn?: boolean
    onDeletePut?: (e: any) => void
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

    return (
        <>
            <Image source={source} resizeMode='contain' style={[{ height, width }, style]} />
            { 
                <View style={{ position: "absolute", right: 20, top: 0 , display : props.hiddenDeleteBtn ? 'none' : undefined, maxHeight: 50, maxWidth: 50 }}>
                    <Button title="×" color="red" onPress={props.onDeletePut}></Button>
                </View>
            }
        </>
    )
}